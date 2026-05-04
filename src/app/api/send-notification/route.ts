import { NextResponse } from "next/server";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT as string
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { tokens, title, message } = body;

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body: message,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json({
      success: false,
    });
  }
}