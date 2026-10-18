import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkerBasicApp from "../WorkerBasicApp";

const auth = vi.hoisted(() => ({ restore: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), hideSplash: vi.fn() }));
vi.mock("../native/workerBasicAuth", () => ({
  restoreWorkerSignIn: auth.restore,
  signInWorker: auth.signIn,
  signOutWorker: auth.signOut,
}));
vi.mock("../native/bootstrap", () => ({ hideSplashScreen: auth.hideSplash }));

vi.mock("../WorkerApp", () => ({ default: () => <div>Caregiver dashboard connected</div> }));

const caregiver = { firstName: "Sam", email: "sam@example.com", status: "approved" };

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.useFakeTimers();
  vi.resetAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  auth.restore.mockResolvedValue(null);
  auth.signIn.mockResolvedValue(caregiver);
  auth.signOut.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function settle() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

describe("basic Worker frontend", () => {
  it("renders sign-in before a hung saved-session restore and releases it after eight seconds", async () => {
    let finishRestore: (value: typeof caregiver) => void;
    auth.restore.mockReturnValue(new Promise((resolve) => { finishRestore = resolve; }));
    render(<WorkerBasicApp />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(auth.hideSplash).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByRole("alert")).toHaveTextContent("took too long");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Retry saved sign-in" })).toBeEnabled();

    await act(async () => { finishRestore(caregiver); });
    expect(screen.queryByText("Welcome, Sam")).not.toBeInTheDocument();
  });

  it("keeps sign-in usable when offline without waiting for auth", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    render(<WorkerBasicApp />);
    expect(auth.restore).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("offline");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("uses the existing caregiver account and signs out to the form", async () => {
    render(<StrictMode><WorkerBasicApp /></StrictMode>);
    await settle();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "Sam@Example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example-password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);
    await settle();
    expect(auth.signIn).toHaveBeenCalledWith("sam@example.com", "example-password");
    expect(screen.getByText("Caregiver dashboard connected")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/psw");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await settle();
    expect(auth.signOut).toHaveBeenCalled();
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("returns a stalled login to retry and accepts a subsequent successful attempt", async () => {
    auth.signIn.mockReturnValueOnce(new Promise(() => undefined));
    render(<WorkerBasicApp />);
    await settle();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: caregiver.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example-password" } });
    const form = screen.getByRole("button", { name: "Sign in" }).closest("form")!;
    fireEvent.submit(form);
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(screen.getByRole("alert")).toHaveTextContent("took too long");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    fireEvent.submit(form);
    await settle();
    expect(screen.getByRole("heading", { name: "Welcome, Sam" })).toBeInTheDocument();
  });

  it("shows account status and a useful error when signing out fails", async () => {
    auth.restore.mockResolvedValue({ ...caregiver, status: "flagged" });
    auth.signOut.mockRejectedValue(new Error("Could not finish signing out. Please try again."));
    render(<WorkerBasicApp />);
    await settle();
    expect(screen.getByText("Please contact the office about your caregiver account.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not finish signing out");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
