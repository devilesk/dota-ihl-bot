dev-build:
	docker-compose build --no-cache
dev:
	docker-compose run app sh
prod:
	docker-compose -f docker-compose.production.yml up -d