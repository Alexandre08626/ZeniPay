"use client";
import { useState, useEffect } from "react";

const G = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 45%, #7B4FBF 100%)";
const B = "#e2e8f0";
const M = "#64748b";
const T = "#0f172a";

const STEPS = ["Business", "Owner KYC", "Bank", "Tests", "Submit"];

export function SetupWizard({ accountId, onComplete }: { accountId: string; onComplete: () => void }) {
  return <div><h2>Coming soon - Setup Wizard</h2><p>Account: {accountId}</p><button onClick={onComplete}>Done</button></div>;
}

export function OnboardingStatus({ accountId, onGoLive }: { accountId: string; onGoLive: () => void }) {
  return <div><h2>Status for {accountId}</h2><button onClick={onGoLive}>Go Live</button></div>;
}
