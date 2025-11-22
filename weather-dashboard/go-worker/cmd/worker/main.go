// go-worker/cmd/worker/main.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/streadway/amqp"
)

type WeatherData struct {
	Timestamp          string  `json:"timestamp"`
	City               string  `json:"city"`
	Country            string  `json:"country"`
	Temperature        float64 `json:"temperature"`
	FeelsLike          float64 `json:"feels_like"`
	Humidity           int     `json:"humidity"`
	Pressure           int     `json:"pressure"`
	WindSpeed          float64 `json:"wind_speed"`
	WindDirection      int     `json:"wind_direction"`
	WeatherCondition   string  `json:"weather_condition"`
	WeatherDescription string  `json:"weather_description"`
	Cloudiness         int     `json:"cloudiness"`
	Visibility         int     `json:"visibility"`
	Sunrise           string  `json:"sunrise"`
	Sunset            string  `json:"sunset"`
}

type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func main() {
	rabbitmqURL := getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
	apiURL := getEnv("API_URL", "http://localhost:3000")

	conn, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v")
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"weather_data",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			log.Printf("Received a message: %s", d.Body)

			var weatherData WeatherData
			if err := json.Unmarshal(d.Body, &weatherData); err != nil {
				log.Printf("Error decoding JSON: %v", err)
				d.Nack(false, false)
				continue
			}

			if err := sendToAPI(apiURL, weatherData); err != nil {
				log.Printf("Error sending to API: %v", err)
				d.Nack(false, true)
				continue
			}

			log.Printf("Successfully processed weather data for %s", weatherData.City)
			d.Ack(false)
		}
	}()

	log.Printf("Worker started. Waiting for messages...")
	<-forever
}

func sendToAPI(apiURL string, data WeatherData) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("error marshaling data: %v", err)
	}

	resp, err := http.Post(apiURL+"/api/weather", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}