package com.megarohas.amtv;

public final class ScreenCurtainTest {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) {
        ScreenCurtain curtain = new ScreenCurtain();
        check(!curtain.isVisible());
        check(!curtain.consumeKey(23, true));
        check(!curtain.consumeKey(23, false));
        curtain.toggle();
        check(curtain.isVisible());
        check(curtain.consumeKey(23, true)); // OK wakes, without clicking
        check(!curtain.isVisible());
        check(curtain.consumeKey(23, true)); // held key repeat stays consumed
        curtain.wake(); // a focus notification must not leak the pending key release
        check(curtain.consumeKey(23, false));
        check(!curtain.consumeKey(23, true)); // next gesture operates normally
        check(!curtain.consumeKey(23, false));
        curtain.toggle();
        curtain.toggle();
        check(!curtain.isVisible());
        curtain.toggle();
        curtain.wake(); // programmatic focus change reveals UI
        check(!curtain.isVisible());
        curtain.toggle();
        check(curtain.consumeKey(85, true)); // media play/pause also only wakes
        curtain.reset(); // leaving/reopening must not retain black mode or stale key state
        check(!curtain.isVisible());
        check(!curtain.consumeKey(85, false));
        curtain.toggle();
        check(curtain.consumeKey(4, false)); // lone Back release wakes without navigating
        check(!curtain.isVisible());
        System.out.println("ScreenCurtain: on-demand toggle, wake gestures/repeats, focus and lifecycle passed");
    }
}
