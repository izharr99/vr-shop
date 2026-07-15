/** Transient per-frame state shared between the player rig and the avatar
 * animator without triggering React re-renders. */
export const moveState = {
  moving: false,
  /** virtual joystick vector from touch controls, unit-ish [-1..1] */
  touchX: 0,
  touchZ: 0,
};
