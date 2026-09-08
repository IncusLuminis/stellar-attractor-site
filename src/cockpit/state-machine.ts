/**
 * Explicit cockpit interaction state machine (Cockpit Interaction Prototype
 * Specification §4). Transitions are enumerated; ambiguous combinations such as
 * "start a drag while a focus transition is running" are simply not reachable.
 *
 * BOOT -> OVERVIEW -> MANUAL_PAN -> OVERVIEW -> FOCUSING -> SYSTEM_ACTIVE
 *      -> RETURNING -> OVERVIEW
 */

export type CockpitState =
  | "BOOT"
  | "OVERVIEW"
  | "MANUAL_PAN"
  | "FOCUSING"
  | "SYSTEM_ACTIVE"
  | "RETURNING";

export type CockpitEvent =
  | "READY"
  | "DRAG_START"
  | "DRAG_END"
  | "FOCUS"
  | "TRANSITION_END"
  | "RETURN";

const TRANSITIONS: Record<CockpitState, Partial<Record<CockpitEvent, CockpitState>>> = {
  BOOT: { READY: "OVERVIEW" },
  OVERVIEW: { DRAG_START: "MANUAL_PAN", FOCUS: "FOCUSING" },
  MANUAL_PAN: { DRAG_END: "OVERVIEW" },
  FOCUSING: { TRANSITION_END: "SYSTEM_ACTIVE" },
  SYSTEM_ACTIVE: { RETURN: "RETURNING" },
  RETURNING: { TRANSITION_END: "OVERVIEW" },
};

export interface StateChange {
  from: CockpitState;
  to: CockpitState;
  event: CockpitEvent;
}

type Listener = (change: StateChange) => void;

export class CockpitStateMachine {
  private current: CockpitState;
  private readonly listeners = new Set<Listener>();

  constructor(initial: CockpitState = "BOOT") {
    this.current = initial;
  }

  get state(): CockpitState {
    return this.current;
  }

  is(...states: CockpitState[]): boolean {
    return states.includes(this.current);
  }

  /** Pure lookup — does not mutate. */
  peek(event: CockpitEvent): CockpitState | null {
    return TRANSITIONS[this.current][event] ?? null;
  }

  can(event: CockpitEvent): boolean {
    return this.peek(event) !== null;
  }

  /**
   * Apply an event. Returns true if it caused a transition, false if the event
   * is not valid from the current state (the machine is unchanged).
   */
  send(event: CockpitEvent): boolean {
    const next = this.peek(event);
    if (next === null) return false;
    const change: StateChange = { from: this.current, to: next, event };
    this.current = next;
    for (const listener of this.listeners) listener(change);
    return true;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Derived capability queries used by the controller / input layers ---

  /** Manual pan (drag or arrows) is only allowed in these states. */
  canManualPan(): boolean {
    return this.is("OVERVIEW", "MANUAL_PAN");
  }

  /** Hotspot activation is only honoured from OVERVIEW (Spec §4, §15). */
  canActivateHotspot(): boolean {
    return this.is("OVERVIEW");
  }

  /** RETURN is only valid once a system is active (Spec §15, §20). */
  canReturn(): boolean {
    return this.is("SYSTEM_ACTIVE");
  }

  /** All manual input is locked while an automatic transition runs (Spec §15). */
  isInputLocked(): boolean {
    return this.is("FOCUSING", "RETURNING");
  }
}
