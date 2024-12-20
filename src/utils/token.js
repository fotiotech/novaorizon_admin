const jwt = require("jsonwebtoken");
const secretKey = require("./secretTokenkey");

function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, secretKey, { expiresIn: "24h" });

  return token;
}

module.exports = generateToken;
