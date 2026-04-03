PROJECT STRUCTURE - Web Proxy Firewall System
1. Tong quan kien truc

He thong duoc xay dung theo mo hinh multi-service su dung Docker Compose, gom:

proxy-service: xu ly request, loc noi dung web
admin-service: giao dien quan tri + API + dashboard
PostgreSQL: luu tru du lieu rules, logs, thong ke

2. Cau truc thu muc tong the
web-proxy-firewall/
|
|-- docker-compose.yml
|-- .env
|-- README.md
|-- PROJECT_STRUCTURE.md
|
|-- docs/
|   |-- architecture.md
|   |-- api-design.md
|   |-- database-design.md
|
|-- proxy-service/
|-- admin-service/
|-- database/

3. Chi tiet proxy-service
proxy-service/
|-- Dockerfile
|-- package.json
|-- .env
`-- src/
    |-- server.js
    |-- config/
    |-- core/
    |-- filters/
    |-- services/
    |-- repositories/
    |-- db/
    |-- utils/
    `-- templates/

4. Chi tiet admin-service
admin-service/
|-- Dockerfile
|-- package.json
|-- .env
`-- src/
    |-- server.js
    |-- routes/
    |-- controllers/
    |-- services/
    |-- repositories/
    |-- db/
    |-- middlewares/
    |-- views/
    `-- public/

5. Database (PostgreSQL)
database/
|-- init/
|   |-- 01_create_tables.sql
|   |-- 02_seed_rules.sql
|   `-- 03_seed_keywords.sql
`-- backup/
