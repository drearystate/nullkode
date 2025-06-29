import {defaultInspectorElementConfig} from '@app/editor/state/generate-inspector-config-for-element';
import {ShadowEditorValue} from '@app/editor/editor-sidebar/inspector-panel/shadow-editor/shadow-editor-value';

// shadow string from computed style will always be in the same format, regardless of how it was entered in css: rgb/rgba color, angle, distance, blur, spread and optional inset
export function parseCssShadow(computedShadow: string): ShadowEditorValue[] {
  if (!computedShadow || computedShadow === 'none') {
    return [];
  }

  return (
    computedShadow
      // remove spaces in rgb color definition
      .replace(/\s+(?=[^()]*\))/g, '')
      // get each separate shadow as array element
      .split(/(?<=px|inset),/g)
      .map(singleShadow => {
        const parts = singleShadow.trim().split(' ');
        // text shadow will have no spread or inset, so always 4 parts
        const isTextShadow = parts.length === 4;
        return {
          type: isTextShadow ? 'text' : 'box',
          color: parts[0],
          angle: parseInt(parts[1]),
          distance: parseInt(parts[2]),
          blur: parseInt(parts[3]),
          spread: isTextShadow ? 0 : parseInt(parts[4]),
          inset: isTextShadow ? false : parts[5] === 'inset',
        };
      })
  );
}

export function shadowEditorValueToString(props: ShadowEditorValue): string {
  const blur = Math.round(props.blur);
  const spread = Math.round(props.spread);
  const angle = props.angle * (Math.PI / 180);
  const x = Math.round(props.distance * Math.cos(angle));
  const y = Math.round(props.distance * Math.sin(angle));
  const inset = props.inset && props.type === 'box' ? 'inset ' : '';
  const color =
    props.color === defaultInspectorElementConfig.color
      ? 'rgba(0,0,0,0.5)'
      : props.color;

  let css = inset + x + 'px ' + y + 'px ' + blur + 'px ';

  // text shadows have no spread property
  if (props.type === 'box') {
    css += spread + 'px ';
  }

  return css + color;
}
