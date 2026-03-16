# Keycloak + Dependencies Docker Setup

## Prerequisites

- Docker & Docker Compose installed
- Ports 8080 (Keycloak), 5432 (Postgres), 6379 (Redis), 27017 (MongoDB) available

## Quick Start

### 1. Start All Services

```bash
cd backend/docker
docker-compose up -d
```

### 2. Verify Services Are Running

```bash
docker-compose ps

# Output should show:
# - postgres (healthy)
# - keycloak (running)
# - redis (healthy)
# - mongodb (healthy)
```

### 3. Access Keycloak Admin Console

- **URL**: http://localhost:8080
- **Username**: admin
- **Password**: admin

### 4. Create Realm and Clients

See [KEYCLOAK_SETUP.md](../KEYCLOAK_SETUP.md) for detailed configuration steps.

## Services

### Keycloak (Port 8081)
- IAM and authentication
- URL: http://localhost:8081

### PostgreSQL (Port 5432)
- Keycloak database
- Username: keycloak
- Password: keycloak_password
- Database: keycloak

### Redis (Port 6379)
- Caching and session store
- Stores token blacklist, sessions, temporary data

### MongoDB (Port 27017)
- Flexible document storage
- Username: admin
- Password: mongodb_password
- Used for workflow definitions, configurations

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f keycloak
docker-compose logs -f postgres
```

### Stop Services

```bash
docker-compose stop
```

### Remove Everything (including volumes)

```bash
docker-compose down -v
```

### Access PostgreSQL CLI

```bash
docker-compose exec postgres psql -U keycloak -d keycloak
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Access MongoDB

```bash
docker-compose exec mongodb mongosh -u admin -p mongodb_password
```

## Environment Variables

### Keycloak

| Variable | Value | Notes |
|----------|-------|-------|
| KEYCLOAK_ADMIN | admin | Admin username |
| KEYCLOAK_ADMIN_PASSWORD | admin | Admin password (change in production) |
| KC_DB | postgres | Database type |
| KC_DB_URL | jdbc:postgresql://postgres:5432/keycloak | Database URL |
| KC_DB_USERNAME | keycloak | DB user |
| KC_DB_PASSWORD | keycloak_password | DB password |

### PostgreSQL

| Variable | Value |
|----------|-------|
| POSTGRES_DB | keycloak |
| POSTGRES_USER | keycloak |
| POSTGRES_PASSWORD | keycloak_password |

### Redis

No environment variables needed for basic setup.

### MongoDB

| Variable | Value |
|----------|-------|
| MONGO_INITDB_ROOT_USERNAME | admin |
| MONGO_INITDB_ROOT_PASSWORD | mongodb_password |

## Production Considerations

1. **Change all default passwords**
   - Keycloak admin password
   - PostgreSQL password
   - MongoDB password

2. **Use volumes for persistence**
   - Already configured in docker-compose.yml
   - Data survives container restarts

3. **Enable HTTPS**
   - Use reverse proxy (nginx)
   - Configure SSL certificates

4. **Resource Limits**
   ```yaml
   services:
     keycloak:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1G
   ```

5. **Backup Strategy**
   ```bash
   # Backup PostgreSQL
   docker-compose exec postgres pg_dump -U keycloak -d keycloak > backup.sql

   # Backup MongoDB
   docker-compose exec mongodb mongodump -u admin -p mongodb_password -o /backup
   ```

## Troubleshooting

### Keycloak won't start
```bash
# Check logs
docker-compose logs keycloak

# Wait for postgres to be healthy
docker-compose restart keycloak
```

### Can't connect to Keycloak
```bash
# Verify container is running
docker ps | grep keycloak

# Check network
docker network inspect backend_idp-network

# Test connectivity
curl http://localhost:8081/health/ready
```

### Port already in use
```bash
# Find what's using the port
lsof -i :8080
netstat -ano | findstr :8080  # Windows

# Change port in docker-compose.yml
# Change "8080:8080" to "8081:8080"
```

## Next Steps

1. Start services: `docker-compose up -d`
2. Create realm: See [KEYCLOAK_SETUP.md](../KEYCLOAK_SETUP.md)
3. Create clients: Configure frontend and backend clients
4. Test authentication: Use provided curl examples
