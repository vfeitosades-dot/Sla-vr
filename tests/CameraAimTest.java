import com.pocket.horizon.CameraAim;

/** Physical basis-vector tests; no Android runtime required. */
public final class CameraAimTest {
    private static void near(double actual, double expected, String label) {
        if (Math.abs(actual - expected) > .0001) throw new AssertionError(label + ": " + actual + " != " + expected);
    }
    private static void pose(float[] matrix, double heading, double pitch, String name) {
        double[] result = CameraAim.fromMatrix(matrix, 27);
        near(result[0], heading, name + " yaw"); near(result[1], pitch, name + " pitch"); near(result[2], 1, name + " valid");
    }
    // Roll changes displayed right/up axes, but leaves the rear optical axis intact.
    private static float[] roll(float[] r, int angle) {
        double a = Math.toRadians(angle), c = Math.cos(a), s = Math.sin(a);
        float[] q = new float[9];
        for (int row = 0; row < 3; row++) {
            q[row*3] = (float)(r[row*3]*c + r[row*3+1]*s);
            q[row*3+1] = (float)(-r[row*3]*s + r[row*3+1]*c);
            q[row*3+2] = r[row*3+2];
        }
        return q;
    }
    public static void main(String[] args) {
        float[] north = {1,0,0, 0,0,-1, 0,1,0}; // screen up = world up; rear camera = north
        float[] east = {0,0,-1, -1,0,0, 0,1,0};
        float[] west = {0,0,1, 1,0,0, 0,1,0};
        float c = (float)Math.cos(Math.PI/6), s = .5f;
        float[] up = {1,0,0, 0,-s,-c, 0,c,-s};
        float[] down = {1,0,0, 0,s,-c, 0,c,s};
        for (int angle : new int[]{0,90,180,270}) {
            pose(roll(north,angle),0,0,"north roll "+angle);
            pose(roll(east,angle),-90,0,"right/east roll "+angle);
            pose(roll(west,angle),90,0,"left/west roll "+angle);
            pose(roll(up,angle),0,30,"up roll "+angle);
            pose(roll(down,angle),0,-30,"down roll "+angle);
        }
        double[] vertical=CameraAim.fromMatrix(new float[]{1,0,0, 0,-1,0, 0,0,-1},38);
        near(vertical[0],38,"vertical heading retained"); near(vertical[1],90,"vertical pitch"); near(vertical[2],0,"vertical heading invalid");
        double[] almostVertical=CameraAim.fromMatrix(new float[]{1,0,0, 0,0,-.1f, 0,0,-(float)Math.sqrt(.99)},-42);
        near(almostVertical[0],-42,"near vertical heading retained"); near(almostVertical[2],0,"near vertical invalid");
        near(CameraAim.tilt(new float[]{0,9.81f,0}),0,"upright acceleration");
        near(CameraAim.tilt(new float[]{0,c*9.81f,-s*9.81f}),30,"up acceleration");
        near(CameraAim.tilt(new float[]{0,c*9.81f,s*9.81f}),-30,"down acceleration");
        near(CameraAim.tilt(new float[]{c*9.81f,0,-s*9.81f}),30,"rolled acceleration");
        near(CameraAim.tilt(new float[]{0,0,0}),0,"missing acceleration");
        System.out.println("PASS: rear-camera north/east/west/up/down, all four display rolls, vertical heading freeze, accelerometer tilt");
    }
}
