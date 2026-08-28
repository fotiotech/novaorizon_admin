// app/emails/VerificationTemplate.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VerificationTemplateProps {
  verificationUrl: string;
}

export const VerificationTemplate = ({
  verificationUrl,
}: VerificationTemplateProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address to activate your account.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome on Board!</Heading>
        <Text style={text}>
          Thank you for signing up. Please click the button below to verify your
          email address and secure your account.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify Email Address
          </Button>
        </Section>
        <Text style={text}>
          This link will expire in 1 hour. If you did not create this account,
          you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
);

// CSS styles designed explicitly for standard email clients
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "560px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
};

const h1 = {
  color: "#1a1f36",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  textAlign: "center" as const,
};

const text = {
  color: "#4f566b",
  fontSize: "16px",
  lineHeight: "1.6",
  textAlign: "center" as const,
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};
