import {
  ArchitectElControl,
  ArchitectElement,
  ElementControlType,
} from '../architect-element';
import {FormElIcon} from '@app/editor/elements/icons/form-el-icon';
import {ReplaceClass} from '@app/editor/mutations/attributes/replace-class';
import {ModifyAttributes} from '@app/editor/mutations/attributes/modify-attributes';
import {mutationState} from '@app/editor/state/mutation-store';

const template = `<form method="POST" action="default-form-handler">
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Name</label>
        <input
          class="form-control"
          id="name"
          name="name"
          type="text"
          placeholder="Name"
          required="required"
          data-validation-required-message="Please enter your name."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Email Address</label>
        <input
          class="form-control"
          id="email"
          name="email"
          type="email"
          placeholder="Email Address"
          required="required"
          data-validation-required-message="Please enter your email address."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Phone Number</label>
        <input
          class="form-control"
          id="phone"
          name="phone"
          type="tel"
          placeholder="Phone Number"
          required="required"
          data-validation-required-message="Please enter your phone number."
        />
      </div>
    </div>
    <div class="control-group">
      <div class="form-group floating-label-form-group controls mb-0 pb-2">
        <label>Message</label>
        <textarea
          class="form-control"
          id="message"
          name="message"
          rows="5"
          placeholder="Message"
          required="required"
          data-validation-required-message="Please enter a message."
        ></textarea>
      </div>
    </div>
    <div class="form-group"><button class="btn btn-primary btn-xl" type="submit">Send</button></div>
  </form>`;

export class FormEl extends ArchitectElement {
  name = 'form';
  contentCategories = ['flow'];
  html = template;
  allowedContent = ['flow'];
  category = 'forms';
  icon = (<FormElIcon />);
  specificity = 3;
  controls = [
    new ArchitectElControl({
      label: 'Layout',
      type: ElementControlType.Select,
      options: [
        {key: 'Basic', value: 'form-default'},
        {key: 'Horizontal', value: 'form-horizontal'},
        {key: 'Inline', value: 'form-inline'},
      ],
      defaultValue(node: HTMLElement) {
        const val = this.options!.find(o => node.classList.contains(o.value));
        return (val || this.options![0]).value;
      },
      onChange(node: HTMLElement, value: string) {
        const currentSize = this.options!.find(o =>
          node.classList.contains(o.value),
        )?.value;
        mutationState().executeMutation(
          new ReplaceClass(node, value, currentSize ?? ''),
          {lastInSession: true},
        );
      },
    }),
    new ArchitectElControl({
      label: 'Action',
      type: ElementControlType.Input,
      defaultValue(node: HTMLElement) {
        return node.getAttribute('action') ?? '';
      },
      onChange(node: HTMLElement, value: string, options) {
        mutationState().executeMutation(
          new ModifyAttributes(node, {
            action:
              // always set default form handler on input blur, if no custom value specified
              value || (options?.lastInSession ? 'default-form-handler' : ''),
          }),
          options,
        );
      },
    }),
  ];
  hiddenClasses = ['form-default', 'form-horizontal', 'form-inline'];
  matcher(node: HTMLElement) {
    return node.nodeName === 'FORM';
  }
}
