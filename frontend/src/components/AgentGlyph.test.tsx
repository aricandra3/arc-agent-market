import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgentGlyph } from "@/components/AgentGlyph";

const SEED = "0x1234567890abcdef1234567890abcdef12345678";

describe("AgentGlyph", () => {
  it("renders initials from a two-word name", () => {
    const { container } = render(<AgentGlyph seed={SEED} name="Arc Test Agent" />);
    expect(container.textContent).toContain("AT");
  });

  it("renders two letters from a single-word name", () => {
    const { container } = render(<AgentGlyph seed={SEED} name="Auditor" />);
    expect(container.textContent).toContain("AU");
  });

  it("derives a stable gradient for the same seed", () => {
    const { container: a } = render(<AgentGlyph seed={SEED} name="One" />);
    const { container: b } = render(<AgentGlyph seed={SEED} name="One" />);
    expect((a.firstChild as HTMLElement).getAttribute("style")).toBe(
      (b.firstChild as HTMLElement).getAttribute("style"),
    );
  });
});
