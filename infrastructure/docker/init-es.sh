#!/bin/sh
set -e

ES_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

echo "Waiting for Elasticsearch at ${ES_URL}..."
until curl -s "${ES_URL}/_cluster/health" | grep -vq '"status":"red"'; do
  sleep 2
done

echo "Elasticsearch is ready. Creating 'emails' index mapping..."
curl -s -X PUT "${ES_URL}/emails" -H 'Content-Type: application/json' -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "email_analyzer": {
          "type": "custom",
          "tokenizer": "uax_url_email",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "campaignId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "senderId": { "type": "keyword" },
      "senderEmail": { "type": "keyword" },
      "recipient": {
        "type": "text",
        "analyzer": "email_analyzer",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "subject": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "body": { "type": "text" },
      "status": { "type": "keyword" },
      "scheduledAt": { "type": "date" },
      "sentAt": { "type": "date" },
      "etherealPreviewUrl": { "type": "keyword", "index": false },
      "createdAt": { "type": "date" }
    }
  }
}'

echo "Index 'emails' initialized successfully."
