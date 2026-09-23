# Railway 12306：按 PPT 流程组织的全栈教学 Demo

这是一个 MySQL + Node.js + Express + HTML + CSS + JavaScript 教学项目。代码结构特意保持简单，便于教师按照 `slides/1.png` 到 `slides/6.png` 的顺序现场输入和讲解。

## PPT 与代码对应关系

| PPT 流程 | 课堂动作 | 主要文件 |
| --- | --- | --- |
| Run your server | 启动 Express，修改页面并刷新 | `backend/server.js`、`frontend/index.html` |
| Build your backend | 写 API、读取已创建的数据库、返回 JSON | `backend/db.js`、`backend/server.js` |
| Build a new backend | 增加新的 SQL 查询与 REST endpoint | `GET /api/trains/:id` 等 |
| Frontend programming | 解释 HTML、CSS、JavaScript 的分工 | `frontend/` |
| Create your frontend webpage | 纯 HTML → CSS → JavaScript → API | `frontend/*.html`、`frontend/css/`、`frontend/js/` |
| Build your website | 建表 → 后端 → 前端 → 校验 | 注册和订单功能 |

## 简化后的目录

```text
backend/
├── database/
│   ├── schema.sql          # 建表
│   └── seed.sql            # 初始车次
├── scripts/
│   └── init-database.js    # 执行 SQL 文件
├── db.js                   # 连接 MySQL
├── validation.js           # 最后加入的后端校验
└── server.js               # Express 和全部 REST API

frontend/
├── index.html              # 主页与搜索
├── register.html           # 注册
├── login.html              # 登录
├── booking.html            # 订票与结果
├── css/style.css           # 页面外观
└── js/
    ├── common.js           # fetch 与登录导航
    ├── home.js             # 搜索交互
    ├── register.js         # 注册交互
    ├── login.js            # 登录交互
    └── booking.js          # 订票交互
```

后端不再拆成 route/controller/service/repository 多层。学生打开 `server.js`，可以从上到下依次读到账号、车次、订单三个 API 区块；等学生掌握完整请求流程后，再讲工程化分层会更自然。

## 启动

假定 MySQL 已经安装并启动：

```bash
cp .env.example .env
```

填写 `.env` 中的 MySQL 用户名和密码，然后执行：

```bash
npm install
npm run db:init
npm start
```

浏览器打开 `http://127.0.0.1:3000`。

## 主要 API

| Method | Endpoint | 用途 |
| --- | --- | --- |
| GET | `/api/session` | 当前登录用户 |
| POST | `/api/register` | 注册并登录 |
| POST | `/api/login` | 登录 |
| POST | `/api/logout` | 退出 |
| GET | `/api/trains` | 按条件搜索车次 |
| GET | `/api/trains/:id` | 查询一条车次 |
| POST | `/api/bookings` | 创建订单 |
| GET | `/api/bookings/:number` | 查看自己的订单 |

## 教案

[docs/教学教案.md](docs/教学教案.md) 已按 6 张 PPT 截图完全重排。每一阶段都包含：

- PPT 页面应表达的核心句
- 教师演示步骤
- 学生需要输入的具体代码
- 运行后应观察到的现象
- 提问与易错点
- 从当前步骤过渡到下一张 PPT 的话术
