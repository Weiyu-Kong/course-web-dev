# Railway 12306 全栈教学 Demo

技术栈保持为 MySQL + Node.js + Express + RESTful API + HTML/CSS/JavaScript。数据库结构和后端写法按照 `slides` 中的新示例组织。

## 数据模型

```text
Traveler 1 ─────── * Booking * ─────── 1 Train
```

- `Traveler`：旅行者身份与登录账号。
- `Train`：车次、服务日期、出发地、目的地和时间。
- `Booking`：把一位 Traveler 与一趟 Train 关联起来。
- `TravelerSession`：登录持久化的基础设施表，不属于核心业务 ER 图。

完整定义见 [schema.sql](backend/database/schema.sql)。

## 后端结构

与 PPT 中的流程一致：

```text
RESTful Route → Controller → DB Access → DB Connection → MySQL
```

| 文件 | 课堂职责 |
| --- | --- |
| `backend/db.js` | DB Connection：创建 MySQL connection pool |
| `backend/db-access.js` | DB Access：`findTrains()` 等 SQL 函数 |
| `backend/controllers.js` | Controller：读取请求、校验、调用 DB Access、返回 JSON |
| `backend/server.js` | Route：HTTP method + URL 与 Controller 的映射 |
| `backend/validation.js` | 输入校验函数 |
| `backend/auth.js` | 密码哈希、Cookie 和 Session 支撑 |

搜索车次的调用过程：

```text
GET /api/trains?origin=Shanghai&destination=Beijing&date=2026-05-31
  → app.get('/api/trains', searchTrains)
  → searchTrains(req, res)
  → findTrains(origin, destination, date)
  → SELECT * FROM Train WHERE ...
  → res.json(...)
```

## 目录

```text
backend/
├── database/
│   ├── schema.sql
│   └── seed.sql
├── scripts/init-database.js
├── db.js
├── db-access.js
├── controllers.js
├── validation.js
├── auth.js
└── server.js

frontend/
├── index.html
├── register.html
├── login.html
├── booking.html
├── css/style.css
└── js/
    ├── common.js
    ├── home.js
    ├── register.js
    ├── login.js
    └── booking.js
```

## 启动

```bash
cp .env.example .env
npm install
npm run db:init
npm start
```

打开 `http://localhost:3000`。

## RESTful API

| Method | Resource | Operation |
| --- | --- | --- |
| GET | `/api/trains` | Search/read trains |
| GET | `/api/trains/:id` | Read one train |
| POST | `/api/travelers` | Create a traveler |
| POST | `/api/sessions` | Create a login session |
| GET | `/api/session` | Read the current session |
| DELETE | `/api/session` | Delete the current session |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings/:number` | Read a booking |

例如：

```bash
curl "http://localhost:3000/api/trains?origin=Shanghai&destination=Beijing&date=2026-05-31"
```

浏览器 JavaScript 中：

```js
fetch('/api/trains?origin=Shanghai&destination=Beijing&date=2026-05-31')
  .then((response) => response.json())
  .then((data) => console.log(data));
```

完整授课流程见 [教学教案.md](docs/教学教案.md)。
