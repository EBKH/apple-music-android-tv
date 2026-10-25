package com.megarohas.amtv;

import java.util.HashSet;
import java.util.Set;

/** On-demand visual state only: no timer, playback commands or persisted preference. */
final class ScreenCurtain {
    private boolean visible;
    private final Set<Integer> wakeKeys = new HashSet<>();

    boolean isVisible() { return visible; }
    void toggle() { visible = !visible; }
    void wake() { visible = false; }
    void reset() { visible = false; wakeKeys.clear(); }

    /** Consume the entire waking key gesture, including repeats and its eventual release. */
    boolean consumeKey(int keyCode, boolean down) {
        boolean consume = visible || wakeKeys.contains(keyCode);
        if (visible && down) wakeKeys.add(keyCode);
        visible = false;
        if (!down) wakeKeys.remove(keyCode);
        return consume;
    }
}
