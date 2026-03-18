import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface AuthRequest extends Request {
  user?: any;
}

const jwksUri = process.env.COGNITO_PUBLIC_KEY;

if (!jwksUri) {
  throw new Error("COGNITO_PUBLIC_KEY is not configured");
}

const client = jwksClient({
  jwksUri,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.split(" ")[1];

  jwt.verify(token, getKey, {}, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}
