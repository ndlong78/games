window.FFV_LAYOUT = (() => {
  const state = { logicalWidth: 0, logicalHeight: 0, dpr: 1 };

  function resizeCanvas(canvas, ctx) {
    state.logicalWidth = window.innerWidth;
    state.logicalHeight = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 3);

    canvas.width = state.logicalWidth * state.dpr;
    canvas.height = state.logicalHeight * state.dpr;
    canvas.style.width = `${state.logicalWidth}px`;
    canvas.style.height = `${state.logicalHeight}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    return { ...state };
  }

  function playAreaPadding() {
    const rootStyle = getComputedStyle(document.documentElement);
    const toPx = (v) => Number.parseFloat(v || '0') || 0;

    return {
      top: toPx(rootStyle.getPropertyValue('--safe-top')),
      right: toPx(rootStyle.getPropertyValue('--safe-right')),
      bottom: toPx(rootStyle.getPropertyValue('--safe-bottom')),
      left: toPx(rootStyle.getPropertyValue('--safe-left'))
    };
  }

  return { resizeCanvas, playAreaPadding, state };
})();
