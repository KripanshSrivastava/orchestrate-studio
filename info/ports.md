# Ports & Services Configuration

## 📋 All Ports Used in Internal Developer Platform

### Frontend Application
| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Vite Dev Server** | `5173` | http://localhost:5173 | React frontend development |

### Keycloak & Authentication
| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Keycloak** | `8081` | http://localhost:8081 | IAM & authentication server |
| **Keycloak Admin** | `8081` | http://localhost:8081/admin | Keycloak admin console |

### Backend API
| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Express Backend** | `3000` | http://localhost:3000 | Node.js API server |
| **Backend Health** | `3000` | http://localhost:3000/health | Health check endpoint |

### Databases & Caching
| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **PostgreSQL** | `5432` | localhost:5432 | Keycloak database |
| **Redis** | `6379` | localhost:6379 | Cache & token store |
| **MongoDB** | `27017` | localhost:27017 | Document database |

---

## 🔐 Authentication Credentials

### Keycloak Admin
```
Username: admin
Password: admin
URL: http://localhost:8081/admin
```

### PostgreSQL (for Keycloak)
```
Host: localhost
Port: 5432
Database: keycloak
Username: keycloak
Password: keycloak_password
```

### MongoDB
```
Host: localhost
Port: 27017
Username: admin
Password: mongodb_password
```

### Redis
```
Host: localhost
Port: 6379
No authentication required (development)
```

---

## 🚀 Quick Access

### Frontend
```
Development: http://localhost:5173
```

### Backend
```
API: http://localhost:3000
Health: http://localhost:3000/health
```

### Authentication
```
Keycloak: http://localhost:8081
Keycloak Admin: http://localhost:8081/admin
```

### Databases
```
PostgreSQL CLI: psql -h localhost -p 5432 -U keycloak
Redis CLI: redis-cli -h localhost -p 6379
MongoDB CLI: mongosh -u admin -p mongodb_password
```

---

## 📝 Environment Configuration

### Frontend (.env.local)
```env
VITE_KEYCLOAK_URL=http://localhost:8081
VITE_KEYCLOAK_REALM=idp
VITE_KEYCLOAK_CLIENT_ID=idp-frontend
VITE_API_URL=http://localhost:3000
```

### Backend (.env)
```env
KEYCLOAK_URL=http://localhost:8081
KEYCLOAK_REALM=idp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=idp_db
DB_USER=idp_user
DB_PASSWORD=secure_password
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URI=mongodb://admin:mongodb_password@localhost:27017
PORT=3000
NODE_ENV=development
```

---

## 🐳 Docker Services

All services run in containers with the following configuration:

```yaml
Services:
  - postgres (PostgreSQL 16)
  - keycloak (Keycloak 24.0)
  - redis (Redis 7)
  - mongodb (MongoDB 7)

Network: idp-network (bridge)
```

### Start Services
```bash
cd backend/docker
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Stop Services
```bash
docker-compose stop
```

### View Logs
```bash
docker-compose logs -f keycloak
```

---

## ⚠️ Port Conflicts

If ports are already in use, you can change them in `docker-compose.yml`:

```yaml
# Change port mapping
services:
  keycloak:
    ports:
      - "8081:8080"  # Change first number to new port
```

### Check if Ports are in Use

**Linux/Mac:**
```bash
lsof -i :5173
lsof -i :8081
lsof -i :3000
lsof -i :5432
lsof -i :6379
lsof -i :27017
```

**Windows:**
```powershell
netstat -ano | findstr "5173"
netstat -ano | findstr "8081"
netstat -ano | findstr "3000"
netstat -ano | findstr "5432"
netstat -ano | findstr "6379"
netstat -ano | findstr "27017"
```

---

## 📊 Development Server Startup Order

1. **Start Docker Stack** (Keycloak, PostgreSQL, Redis, MongoDB)
   ```bash
   cd backend/docker
   docker-compose up -d
   ```

2. **Start Backend API** (Port 3000)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start Frontend** (Port 5173)
   ```bash
   npm run dev
   ```

### Recommended Flow
```
Terminal 1: cd backend/docker && docker-compose up -d
Wait 30 seconds for services...

Terminal 2: cd backend && npm run dev
(Backend running on :3000)

Terminal 3: npm run dev
(Frontend running on :5173)
```

---

## 🧪 Test Connectivity

### Frontend
```bash
curl http://localhost:5173
```

### Backend
```bash
curl http://localhost:3000/health
```

### Keycloak
```bash
curl http://localhost:8081/health/ready
```

### PostgreSQL
```bash
psql -h localhost -p 5432 -U keycloak -d keycloak -c "SELECT version();"
```

### Redis
```bash
redis-cli -h localhost -p 6379 ping
```

### MongoDB
```bash
mongosh "mongodb://admin:mongodb_password@localhost:27017"
```

---

## 🔄 Service Descriptions

### Vite Dev Server (5173)
- Hot reload development server
- Serves React frontend
- Development only

### Keycloak (8081)
- OpenID Connect & OAuth 2.0 provider
- User management & authentication
- Required for all auth operations

### Express Backend (3000)
- REST API server
- Handles business logic
- Connects to databases

### PostgreSQL (5432)
- Primary database for Keycloak
- Also used for app-specific data
- Persistent storage

### Redis (6379)
- In-memory cache
- Session store
- Token blacklist management

### MongoDB (27017)
- NoSQL document database
- Flexible schema storage
- Workflow definitions & configs

---

## 📌 Important Notes

- **Keycloak URL Updated**: Changed from 8080 to 8081 to avoid conflict with frontend
- **Frontend Port**: 5173 (Vite default)
- **Backend Port**: 3000 (Express default)
- **All services**: Running in Docker containers
- **Network**: All services connected via `idp-network` bridge

---

## 🔧 Troubleshooting

### Port Already in Use
- Find process: `lsof -i :<port>` or `netstat -ano | findstr "<port>"`
- Kill process or change port in docker-compose.yml

### Services Won't Start
- Check Docker is running
- Check logs: `docker-compose logs <service-name>`
- Ensure sufficient disk space & memory

### Connection Refused
- Verify service is running: `docker-compose ps`
- Check firewall settings
- Verify port mapping in docker-compose.yml

---

**Last Updated**: March 16, 2026  
**Version**: 1.0.0
