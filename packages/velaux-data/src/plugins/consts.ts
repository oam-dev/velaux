import { join } from "lodash";

export type Marker = string;
export type Position = string

export const Sep = '.'
// j accept random number of Maker
const j = (...s: Marker[]): Position => join(s, Sep) as Position;

export const MDefinition: Marker = 'definition';

export const MComponent: Marker = 'component';
export const MTrait: Marker = 'trait';
export const MPolicy: Marker = 'policy';
export const MWorkflowStep: Marker = 'workflow_step';

export const PComponent: Position = j(MDefinition, MComponent);
export const PTrait: Position = j(MDefinition, MTrait);
export const PPolicy: Position = j(MDefinition, MPolicy);
export const PWorkflowStep: Position = j(MDefinition, MWorkflowStep);

// checkPrefix checks if the given position is a prefix of the given position.
function checkPrefix(position: Position, prefix: string): [boolean, string] {
  let ok = position.startsWith(prefix);
  if (!ok) {
    return [false, ""];
  }
  let name = position.slice(prefix.length + 1);
  return [true, name];
}

// isComponent checks if a position is a component. return [true, name] if it is.
export function isComponent(p: Position): [boolean, string] {
  return checkPrefix(p, PComponent);
}

// isTrait checks if a position is a trait. return [true, name] if it is.
export function isTrait(p: Position): [boolean, string] {
  return checkPrefix(p, PTrait);
}

// isPolicy checks if a position is a policy. return [true, name] if it is.
export function isPolicy(p: Position): [boolean, string] {
  return checkPrefix(p, PPolicy);
}

// isWorkflowStep checks if a position is a workflow step. return [true, name] if it is.
export function isWorkflowStep(p: Position): [boolean, string] {
  return checkPrefix(p, PWorkflowStep);
}
