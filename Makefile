.PHONY: docker-build
docker-build:
	docker build -t billing_service:0.1 . --ssh default=../sshkeys
