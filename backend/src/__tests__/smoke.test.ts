import { describe, it, expect } from "vitest";
import {
  WorkOrderStateMachine,
  TransitionError,
} from "../modules/work-orders/state-machine/transitions";

describe("WorkOrderStateMachine — smoke", () => {
  it("permite la transición received → diagnosing", () => {
    expect(WorkOrderStateMachine.canTransition("received", "diagnosing")).toBe(true);
  });

  it("bloquea saltar estados (received → delivered)", () => {
    expect(WorkOrderStateMachine.canTransition("received", "delivered")).toBe(false);
  });

  it("delivered es un estado terminal", () => {
    expect(WorkOrderStateMachine.isTerminal("delivered")).toBe(true);
  });

  it("received no es un estado terminal", () => {
    expect(WorkOrderStateMachine.isTerminal("received")).toBe(false);
  });

  it("assertTransition lanza TransitionError en transición inválida", () => {
    expect(() =>
      WorkOrderStateMachine.assertTransition("delivered", "in_progress")
    ).toThrowError(TransitionError);
  });

  it("getAvailableTransitions retorna las transiciones correctas desde in_progress", () => {
    const next = WorkOrderStateMachine.getAvailableTransitions("in_progress");
    expect(next).toContain("quality_control");
    expect(next).toContain("cancelled");
  });
});
