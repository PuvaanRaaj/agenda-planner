package db

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq"
)

const (
	maxRetries = 10
	retryDelay = 2 * time.Second
)

func New(databaseURL string) (*sql.DB, error) {
	var db *sql.DB
	var err error
	for i := 0; i < maxRetries; i++ {
		db, err = sql.Open("postgres", databaseURL)
		if err != nil {
			log.Printf("db open attempt %d: %v", i+1, err)
			time.Sleep(retryDelay)
			continue
		}
		if err = db.Ping(); err != nil {
			log.Printf("db ping attempt %d: %v", i+1, err)
			db.Close()
			time.Sleep(retryDelay)
			continue
		}
		break
	}
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	return db, nil
}
