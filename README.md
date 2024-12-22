# E-commerce Website

An e-commerce platform built using **EJS**, **Express.js**, and **MongoDB**. <br>
### check out [features](./features.md)

---

## Getting Started

### Prerequisites
Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v14 or above recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or on a cloud service like MongoDB Atlas)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root of the project.
   - Add the following variables:
     ```env
     MONGO_URI=<your-mongodb-connection-string>

     *USER_MAIL - for nodemailer setup(optional)
     *USER_PASS - for nodemailer setup(optional)
     ```

### Running the Application

1. Start the MongoDB server:
   ```bash
   mongod
   ```
   If you are using MongoDB Atlas, ensure your connection string is correctly configured in the `.env` file.

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```
