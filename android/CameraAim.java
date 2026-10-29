package com.pocket.horizon;
/** Rear-camera forward in Android ENU -> Three.js east/up/south, degrees. */
public final class CameraAim {
    public static double[] fromMatrix(float[] r, double previousHeading) {
        double east = -r[2], north = -r[5], up = -r[8];
        double horizontal = Math.hypot(east, north);
        // Heading is undefined when aiming almost vertically; keep the last value.
        boolean headingValid = horizontal > .12;
        double yaw = headingValid ? Math.toDegrees(Math.atan2(-east, north)) : previousHeading;
        double pitch = Math.toDegrees(Math.atan2(up, horizontal));
        return new double[]{yaw, pitch, headingValid ? 1 : 0};
    }
    public static double tilt(float[] gravity) {
        double norm = Math.sqrt(gravity[0]*gravity[0]+gravity[1]*gravity[1]+gravity[2]*gravity[2]);
        if (norm < .01) return 0;
        return Math.toDegrees(Math.asin(Math.max(-1, Math.min(1, -gravity[2]/norm))));
    }
}
