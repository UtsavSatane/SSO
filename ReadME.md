# 🔐 Single Sign-On (SSO) Authentication System

A secure **Single Sign-On (SSO)** authentication system built using the **MERN Stack**, implementing **OpenID Connect (OIDC)** for centralized authentication and authorization. The project demonstrates modern identity management by enabling users to authenticate once and securely access multiple applications without repeated logins.

The system integrates an **Identity Provider (IdP)** with client applications using the OpenID Connect protocol, while leveraging **PostgreSQL** for persistent storage, **Redis** for caching and session management, and **Docker** for containerized deployment.

---

## 🚀 Features

- 🔑 Single Sign-On (SSO) Authentication
- 🛡️ OpenID Connect (OIDC) based authentication flow
- 👤 User Registration & Login
- 🔒 Secure Session Management
- 🎫 JWT Token Generation & Validation
- 🔄 Token Refresh Mechanism
- 💾 PostgreSQL Database Integration
- ⚡ Redis Caching & Session Storage
- 📜 JSON Web Key Set (JWKS) Support
- 🔐 Authorization Middleware
- 📋 Protected Routes
- 🐳 Docker Support
- 📊 Logging System
- 🌐 MERN Stack Architecture

---

# 🏗️ System Architecture

```
                +-------------------+
                |      Client       |
                |    (React App)    |
                +---------+---------+
                          |
                          |
                OpenID Connect Login
                          |
                          ▼
                +-------------------+
                | Identity Provider |
                |   (Express.js)    |
                +---------+---------+
                          |
         +----------------+----------------+
         |                                 |
         ▼                                 ▼
 PostgreSQL Database                 Redis Cache
(User Information)              (Sessions & Tokens)
```

---

# 🛠️ Tech Stack

## Frontend

- React.js
- Vite
- HTML5
- CSS3
- JavaScript (ES6+)

## Backend

- Node.js
- Express.js
- OpenID Connect (OIDC)
- JWT Authentication

## Database

- PostgreSQL

## Caching

- Redis

## Containerization

- Docker

## Other Libraries

- Express
- Passport (if used)
- OpenID Client
- JSON Web Token
- dotenv
- bcrypt
- pg
- Redis Client

---

# 📂 Project Structure

```
SSO
│
├── certs/                  # Certificates for OIDC
│
├── elms/                   # Client Application
│   ├── src/
│   ├── server/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── db.js
│   │   └── server.js
│   └── package.json
│
├── idp/                    # Identity Provider
│   ├── views/
│   │   ├── login.ejs
│   │   ├── register.ejs
│   │   └── dashboard.ejs
│   ├── logs/
│   ├── cache.js
│   ├── db.js
│   ├── jwks.json
│   ├── logger.js
│   ├── active_users.json
│   └── .env
│
└── README.md
```

---

# 🔄 Authentication Flow

1. User opens the client application.
2. User selects **Login**.
3. Client redirects the user to the Identity Provider.
4. User authenticates using their credentials.
5. Identity Provider verifies the credentials using PostgreSQL.
6. Upon successful authentication:
   - ID Token is generated.
   - Access Token is issued.
   - Session details are stored in Redis.
7. User is redirected back to the client application.
8. Protected APIs validate the JWT using the JWKS endpoint.
9. User can securely access authorized resources without logging in again.

---

# 📦 Installation

## Clone the Repository

```bash
git clone https://github.com/yourusername/SSO.git

cd SSO
```

---

## Install Dependencies

### Identity Provider

```bash
cd idp
npm install
```

### Client Application

```bash
cd ../elms
npm install
```

---

## Configure Environment Variables

Create a `.env` file inside the `idp` folder.

Example:

```env
PORT=4000

DATABASE_URL=your_postgresql_connection

REDIS_URL=your_redis_connection

SESSION_SECRET=your_secret_key

CLIENT_ID=client_id

CLIENT_SECRET=client_secret

ISSUER=http://localhost:4000
```

---

# ▶️ Running the Project

## Start PostgreSQL

```bash
docker compose up postgres
```

---

## Start Redis

```bash
docker compose up redis
```

---

## Run Identity Provider

```bash
cd idp

npm start
```

---

## Run Client

```bash
cd elms

npm run dev
```

---

# 🔒 Security Features

- Password Hashing
- JWT Authentication
- OpenID Connect Protocol
- Secure Session Storage
- Protected API Endpoints
- JWKS for Token Verification
- Session Expiration
- Environment Variable Protection

---

# 📁 Important Components

| Component | Purpose |
|------------|----------|
| Identity Provider | Authenticates users |
| Client Application | Consumes OIDC Authentication |
| PostgreSQL | Stores user information |
| Redis | Session & Cache Storage |
| JWKS | Public Keys for JWT Verification |
| Middleware | Route Protection |
| Logger | Authentication Logs |

---

# 🌟 Future Enhancements

- Google Login
- Microsoft Azure AD Login
- Multi-Factor Authentication (MFA)
- Role-Based Access Control (RBAC)
- OAuth 2.0 Authorization Server
- Admin Dashboard
- User Management Portal
- Refresh Token Rotation
- Kubernetes Deployment
- HTTPS & SSL Configuration

---

# 📚 Learning Outcomes

This project demonstrates practical implementation of:

- OpenID Connect (OIDC)
- OAuth 2.0 Concepts
- JWT Authentication
- Identity Provider Architecture
- Secure Authentication Flow
- Redis Session Management
- PostgreSQL Integration
- Docker-based Deployment
- MERN Stack Development

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Added new feature"
```

4. Push to GitHub

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# 📄 License

This project is intended for educational and learning purposes.

---

## 👨‍💻 Author

**Utsav Satane**

GitHub: https://github.com/UtsavSatane

LinkedIn: [https://linkedin.com/in/yourprofile](https://www.linkedin.com/in/utsav-satane-a1b211291/)
