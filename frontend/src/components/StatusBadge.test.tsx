import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/StatusBadge";

describe("StatusBadge (agent)", () => {
  it("renders Active for an active agent", () => {
    render(<StatusBadge kind="agent" status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Inactive for an inactive agent", () => {
    render(<StatusBadge kind="agent" status="inactive" />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});

describe("StatusBadge (receipt)", () => {
  it("renders the receipt status label", () => {
    render(<StatusBadge kind="receipt" status="passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });
});
