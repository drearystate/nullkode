import {EditorSidebarHeading} from '@app/editor/editor-sidebar/editor-sidebar-heading';
import {Trans} from '@common/i18n/trans';
import {Fragment, useState} from 'react';
import {useEditorStore} from '@app/editor/state/editor-store';
import {Accordion, AccordionItem} from '@common/ui/accordion/accordion';
import {Button} from '@common/ui/buttons/button';
import {AddIcon} from '@common/icons/material/Add';
import {IconButton} from '@common/ui/buttons/icon-button';
import {CloseIcon} from '@common/icons/material/Close';
import {EditIcon} from '@common/icons/material/Edit';
import {PlayArrowIcon} from '@common/icons/material/PlayArrow';
import {LinkIcon} from '@common/icons/material/Link';
import {EmailIcon} from '@common/icons/material/Email';
import {PhoneIcon} from '@common/icons/material/Phone';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import actionsImage from './inspector-panel/website-builder.svg';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {DialogFooter} from '@common/ui/overlays/dialog/dialog-footer';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {Form} from '@common/ui/forms/form';
import {useForm} from 'react-hook-form';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {CloudIcon} from '@common/icons/material/Cloud';
import {TimerIcon} from '@common/icons/material/Timer';
import {StorageIcon} from '@common/icons/material/Storage';
import {TouchAppIcon} from '@common/icons/material/TouchApp';
import {ApiBrowser} from '../api-integrations/api-browser';
import {ApiConfigurator} from '../api-integrations/api-configurator';
import {ApiProvider, ApiEndpoint} from '../api-integrations/api-registry';
import {TriggerEventRegistry, getTriggersByCategory, TriggerEvent} from '../triggers/trigger-registry';
import {NavigationIcon} from '@common/icons/material/Navigation';
import {PersonIcon} from '@common/icons/material/Person';

interface ExistingAction {
  type: 'navigate' | 'email' | 'phone' | 'form';
  label: string;
  value: string;
  target?: string;
}

function getExistingActions(node: HTMLElement): ExistingAction[] {
  const actions: ExistingAction[] = [];
  
  // Check for navigation actions (href attribute)
  const href = node.getAttribute('href');
  if (href) {
    if (href.startsWith('mailto:')) {
      const email = href.replace('mailto:', '').split('?')[0];
      actions.push({
        type: 'email',
        label: 'Open Email',
        value: email,
      });
    } else if (href.startsWith('tel:')) {
      const phone = href.replace('tel:', '');
      actions.push({
        type: 'phone',
        label: 'Make Phone Call',
        value: phone,
      });
    } else {
      actions.push({
        type: 'navigate',
        label: 'Navigate to URL',
        value: href,
        target: node.getAttribute('target') || '_self',
      });
    }
  }
  
  // Check for form actions
  if (node.nodeName === 'FORM') {
    const action = node.getAttribute('action');
    if (action) {
      actions.push({
        type: 'form',
        label: 'Form Submission',
        value: action,
      });
    }
  }
  
  return actions;
}

export function ActionsPanel() {
  const selectedCtx = useEditorStore(s => s.selectedContext);

  return (
    <div>
      <EditorSidebarHeading>
        <Trans message="Actions" />
      </EditorSidebarHeading>
      
      {selectedCtx ? (
        <div className="px-12">
          <SelectedElementActions />
          <Accordion mode="multiple" defaultExpandedValues={[0, 1]}>
            <AccordionItem label={<Trans message="Click Actions" />}>
              <ClickActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="Hover Actions" />}>
              <HoverActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="Form Actions" />}>
              <FormActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="Animation Actions" />}>
              <AnimationActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="API Actions" />}>
              <ApiActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="Automation Triggers" />}>
              <TriggerActionsEditor />
            </AccordionItem>
            <AccordionItem label={<Trans message="Smart Navigation" />}>
              <NavigationActionsEditor />
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <NothingSelectedMessage />
      )}
    </div>
  );
}

function SelectedElementActions() {
  const selectedCtx = useEditorStore(s => s.selectedContext);
  
  if (!selectedCtx) return null;

  return (
    <div className="mb-20 rounded border bg-chip p-12">
      <div className="mb-8 text-sm font-medium">
        <Trans message="Selected Element" />
      </div>
      <div className="text-xs text-muted">
        {selectedCtx.el.name}
      </div>
      <div className="mt-8 text-xs text-muted">
        <Trans message="Configure actions and behaviors for this element" />
      </div>
    </div>
  );
}

function ClickActionsEditor() {
  const selectedCtx = useEditorStore(s => s.selectedContext);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const form = useForm();

  const handleAddAction = (type: string) => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const handleSaveAction = (values: any) => {
    // Here you would save the action to the selected element
    console.log('Saving action:', actionType, values);
    setIsDialogOpen(false);
    form.reset();
  };

  // Extract existing actions from the selected element
  const existingActions = selectedCtx ? getExistingActions(selectedCtx.node) : [];

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Define what happens when the element is clicked" />
      </div>
      
      {/* Show existing actions */}
      {existingActions.length > 0 && (
        <div className="space-y-8">
          <div className="text-xs font-medium text-muted">
            <Trans message="Current Actions" />
          </div>
          {existingActions.map((action, index) => (
            <ExistingActionItem
              key={index}
              action={action}
              onEdit={() => {
                setActionType(action.type);
                setIsDialogOpen(true);
              }}
              onDelete={() => {
                // TODO: Remove action from element
                console.log('Delete action:', action);
              }}
            />
          ))}
        </div>
      )}
      
      {/* Add new actions */}
      <div className="space-y-8">
        <div className="text-xs font-medium text-muted">
          <Trans message="Add New Actions" />
        </div>
        <ActionItem
          icon={<LinkIcon size="sm" />}
          title="Navigate to URL"
          description="Redirect to another page or website"
          onAdd={() => handleAddAction('navigate')}
        />
        <ActionItem
          icon={<EmailIcon size="sm" />}
          title="Open Email"
          description="Open default email client"
          onAdd={() => handleAddAction('email')}
        />
        <ActionItem
          icon={<PhoneIcon size="sm" />}
          title="Make Phone Call"
          description="Initiate phone call on mobile devices"
          onAdd={() => handleAddAction('phone')}
        />
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Trigger Animation"
          description="Play a custom animation"
          onAdd={() => handleAddAction('animation')}
        />
      </div>

      <DialogTrigger type="modal" isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <Dialog>
          <DialogHeader>
            <Trans message="Configure Action" />
          </DialogHeader>
          <DialogBody>
            <Form form={form} onSubmit={handleSaveAction}>
              <ActionConfigForm actionType={actionType} />
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" onClick={() => setIsDialogOpen(false)}>
              <Trans message="Cancel" />
            </Button>
            <Button 
              variant="flat" 
              color="primary"
              onClick={form.handleSubmit(handleSaveAction)}
            >
              <Trans message="Save Action" />
            </Button>
          </DialogFooter>
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

function HoverActionsEditor() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const form = useForm();

  const handleAddAction = (type: string) => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const handleSaveAction = (values: any) => {
    console.log('Saving hover action:', actionType, values);
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Define what happens when the element is hovered" />
      </div>
      
      <div className="space-y-8">
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Show Tooltip"
          description="Display additional information on hover"
          onAdd={() => handleAddAction('tooltip')}
        />
        <ActionItem
          icon={<EditIcon size="sm" />}
          title="Change Style"
          description="Modify appearance on hover"
          onAdd={() => handleAddAction('style')}
        />
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Scale Effect"
          description="Grow or shrink element on hover"
          onAdd={() => handleAddAction('scale')}
        />
      </div>

      <DialogTrigger type="modal" isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <Dialog>
          <DialogHeader>
            <Trans message="Configure Hover Action" />
          </DialogHeader>
          <DialogBody>
            <Form form={form} onSubmit={handleSaveAction}>
              <HoverActionConfigForm actionType={actionType} />
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" onClick={() => setIsDialogOpen(false)}>
              <Trans message="Cancel" />
            </Button>
            <Button 
              variant="flat" 
              color="primary"
              onClick={form.handleSubmit(handleSaveAction)}
            >
              <Trans message="Save Action" />
            </Button>
          </DialogFooter>
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

function FormActionsEditor() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const form = useForm();

  const handleAddAction = (type: string) => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const handleSaveAction = (values: any) => {
    console.log('Saving form action:', actionType, values);
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Configure form submission and validation" />
      </div>
      
      <div className="space-y-8">
        <ActionItem
          icon={<EmailIcon size="sm" />}
          title="Email Submission"
          description="Send form data via email"
          onAdd={() => handleAddAction('email')}
        />
        <ActionItem
          icon={<LinkIcon size="sm" />}
          title="Webhook URL"
          description="POST data to external service"
          onAdd={() => handleAddAction('webhook')}
        />
        <ActionItem
          icon={<EditIcon size="sm" />}
          title="Form Validation"
          description="Add client-side validation rules"
          onAdd={() => handleAddAction('validation')}
        />
      </div>

      <DialogTrigger type="modal" isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <Dialog>
          <DialogHeader>
            <Trans message="Configure Form Action" />
          </DialogHeader>
          <DialogBody>
            <Form form={form} onSubmit={handleSaveAction}>
              <FormActionConfigForm actionType={actionType} />
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" onClick={() => setIsDialogOpen(false)}>
              <Trans message="Cancel" />
            </Button>
            <Button 
              variant="flat" 
              color="primary"
              onClick={form.handleSubmit(handleSaveAction)}
            >
              <Trans message="Save Action" />
            </Button>
          </DialogFooter>
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

function AnimationActionsEditor() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const form = useForm();

  const handleAddAction = (type: string) => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const handleSaveAction = (values: any) => {
    console.log('Saving animation action:', actionType, values);
    setIsDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Add animations and transitions" />
      </div>
      
      <div className="space-y-8">
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Fade In"
          description="Element fades in when scrolled into view"
          onAdd={() => handleAddAction('fade')}
        />
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Slide Animation"
          description="Element slides in from specified direction"
          onAdd={() => handleAddAction('slide')}
        />
        <ActionItem
          icon={<PlayArrowIcon size="sm" />}
          title="Bounce Effect"
          description="Element bounces when triggered"
          onAdd={() => handleAddAction('bounce')}
        />
      </div>

      <DialogTrigger type="modal" isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <Dialog>
          <DialogHeader>
            <Trans message="Configure Animation" />
          </DialogHeader>
          <DialogBody>
            <Form form={form} onSubmit={handleSaveAction}>
              <AnimationActionConfigForm actionType={actionType} />
            </Form>
          </DialogBody>
          <DialogFooter>
            <Button variant="text" onClick={() => setIsDialogOpen(false)}>
              <Trans message="Cancel" />
            </Button>
            <Button 
              variant="flat" 
              color="primary"
              onClick={form.handleSubmit(handleSaveAction)}
            >
              <Trans message="Save Animation" />
            </Button>
          </DialogFooter>
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

function ApiActionsEditor() {
  const [showApiBrowser, setShowApiBrowser] = useState(false);
  const [selectedConfiguration, setSelectedConfiguration] = useState<any>(null);

  const handleApiSelect = (provider: ApiProvider, endpoint: ApiEndpoint) => {
    console.log('Selected API:', provider, endpoint);
    setShowApiBrowser(false);
  };

  const handleApiSave = (configuration: any) => {
    setSelectedConfiguration(configuration);
    console.log('API Configuration saved:', configuration);
  };

  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Connect to external APIs and services" />
      </div>
      
      {showApiBrowser ? (
        <ApiBrowser 
          onEndpointSelect={handleApiSelect} 
          onBack={() => setShowApiBrowser(false)}
        />
      ) : (
        <div className="space-y-8">
          <ActionItem
            icon={<CloudIcon size="sm" />}
            title="Browse API Integrations"
            description="Connect to OpenAI, Twilio, Weather APIs and more"
            onAdd={() => setShowApiBrowser(true)}
          />
        </div>
      )}
    </div>
  );
}

function TriggerActionsEditor() {
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerEvent | null>(null);
  
  const userTriggers = getTriggersByCategory('user');
  const timerTriggers = getTriggersByCategory('timer');
  const dataTriggers = getTriggersByCategory('data');
  
  const handleAddTrigger = (trigger: TriggerEvent) => {
    setSelectedTrigger(trigger);
    // TODO: Open trigger configuration dialog
    console.log('Adding trigger:', trigger);
  };
  
  return (
    <div className="space-y-12">
      <div className="text-sm">
        <Trans message="Set up automation triggers for this element" />
      </div>
      
      {/* User Interaction Triggers */}
      <div>
        <div className="mb-8 flex items-center gap-8 text-xs font-medium text-muted">
          <TouchAppIcon size="xs" />
          <Trans message="User Interactions" />
        </div>
        <div className="space-y-6">
          {userTriggers.slice(0, 2).map((trigger) => (
            <ActionItem
              key={trigger.id}
              icon={<TouchAppIcon size="sm" />}
              title={trigger.name}
              description={trigger.description}
              onAdd={() => handleAddTrigger(trigger)}
            />
          ))}
        </div>
      </div>
      
      {/* Timer Triggers */}
      <div>
        <div className="mb-8 flex items-center gap-8 text-xs font-medium text-muted">
          <TimerIcon size="xs" />
          <Trans message="Scheduled Events" />
        </div>
        <div className="space-y-6">
          {timerTriggers.slice(0, 2).map((trigger) => (
            <ActionItem
              key={trigger.id}
              icon={<TimerIcon size="sm" />}
              title={trigger.name}
              description={trigger.description}
              onAdd={() => handleAddTrigger(trigger)}
            />
          ))}
        </div>
      </div>
      
      {/* Data Triggers */}
      <div>
        <div className="mb-8 flex items-center gap-8 text-xs font-medium text-muted">
          <StorageIcon size="xs" />
          <Trans message="Data Events" />
        </div>
        <div className="space-y-6">
          {dataTriggers.slice(0, 2).map((trigger) => (
            <ActionItem
              key={trigger.id}
              icon={<StorageIcon size="sm" />}
              title={trigger.name}
              description={trigger.description}
              onAdd={() => handleAddTrigger(trigger)}
            />
          ))}
        </div>
      </div>
      
      <Button variant="outline" size="sm" startIcon={<AddIcon />} className="w-full">
        <Trans message="Add Custom Trigger" />
      </Button>
    </div>
  );
}

function NavigationActionsEditor() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const form = useForm();

  const handleAddAction = (type: string) => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  const handleSaveAction = (values: any) => {
    console.log('Saving navigation action:', actionType, values);
    setIsDialogOpen(false);
    form.reset();
  };

  const navigationActions = [
    {
      id: 'data-driven-navigation',
      title: 'Data-Driven Navigation',
      description: 'Navigate with data - like clicking a list item to see its details',
      icon: <StorageIcon />
    },
    {
      id: 'user-driven-navigation', 
      title: 'User-Driven Navigation',
      description: 'Navigate based on who the user is - bring their personal data along',
      icon: <PersonIcon />
    }
  ];

  return (
    <div className="space-y-12">
      <div className="text-sm text-muted">
        <Trans message="Create smart navigation that carries data and user context between pages" />
      </div>
      
      <div className="grid gap-8">
        {navigationActions.map((action) => (
          <ActionItem
            key={action.id}
            icon={action.icon}
            title={action.title}
            description={action.description}
            onAdd={() => handleAddAction(action.id)}
          />
        ))}
      </div>

      {/* Navigation Action Dialog */}
      <DialogTrigger
        type="modal"
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <Dialog size="lg">
          <DialogHeader>
            <Trans message="Configure Navigation Action" />
          </DialogHeader>
          <DialogBody>
            <Form form={form} onSubmit={handleSaveAction}>
              {actionType === 'data-driven-navigation' && (
                <DataDrivenNavigationForm onSubmit={handleSaveAction} />
              )}
              {actionType === 'user-driven-navigation' && (
                <UserDrivenNavigationForm onSubmit={handleSaveAction} />
              )}
            </Form>
          </DialogBody>
        </Dialog>
      </DialogTrigger>
    </div>
  );
}

interface ActionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
}

function ActionConfigForm({actionType}: {actionType: string}) {
  switch (actionType) {
    case 'navigate':
      return (
        <div className="space-y-16">
          <TextField
            name="url"
            label={<Trans message="URL" />}
            placeholder="https://example.com"
            required
          />
          <TextField
            name="target"
            label={<Trans message="Open in" />}
            placeholder="_self or _blank"
          />
        </div>
      );
    case 'email':
      return (
        <div className="space-y-16">
          <TextField
            name="email"
            label={<Trans message="Email address" />}
            placeholder="contact@example.com"
            required
          />
          <TextField
            name="subject"
            label={<Trans message="Subject (optional)" />}
            placeholder="Subject line"
          />
        </div>
      );
    case 'phone':
      return (
        <TextField
          name="phone"
          label={<Trans message="Phone number" />}
          placeholder="+1234567890"
          required
        />
      );
    case 'animation':
      return (
        <div className="space-y-16">
          <TextField
            name="animation"
            label={<Trans message="Animation type" />}
            placeholder="fadeIn, slideUp, bounce"
          />
          <TextField
            name="duration"
            label={<Trans message="Duration (ms)" />}
            placeholder="300"
            type="number"
          />
        </div>
      );
    default:
      return null;
  }
}

function ExistingActionItem({action, onEdit, onDelete}: {
  action: ExistingAction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'navigate': return <LinkIcon size="sm" />;
      case 'email': return <EmailIcon size="sm" />;
      case 'phone': return <PhoneIcon size="sm" />;
      case 'form': return <EmailIcon size="sm" />;
      default: return <PlayArrowIcon size="sm" />;
    }
  };

  return (
    <div className="flex items-start gap-8 rounded border border-primary/20 bg-primary/5 p-8">
      <div className="mt-2 flex-shrink-0 text-primary">
        {getActionIcon(action.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{action.label}</div>
        <div className="text-xs text-muted">
          {action.value}
          {action.target && action.target !== '_self' && (
            <span className="ml-1">({action.target})</span>
          )}
        </div>
      </div>
      <div className="flex gap-4">
        <IconButton size="xs" onClick={onEdit}>
          <EditIcon size="xs" />
        </IconButton>
        <IconButton size="xs" onClick={onDelete}>
          <CloseIcon size="xs" />
        </IconButton>
      </div>
    </div>
  );
}

function ActionItem({icon, title, description, onEdit, onDelete, onAdd}: ActionItemProps) {
  return (
    <div className="flex items-start gap-8 rounded border p-8 hover:bg-hover">
      <div className="mt-2 flex-shrink-0 text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
      <div className="flex gap-4">
        {onAdd && (
          <Button size="xs" variant="outline" onClick={onAdd}>
            <Trans message="Add" />
          </Button>
        )}
        {onEdit && (
          <IconButton size="xs" onClick={onEdit}>
            <EditIcon size="xs" />
          </IconButton>
        )}
        {onDelete && (
          <IconButton size="xs" onClick={onDelete}>
            <CloseIcon size="xs" />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function NothingSelectedMessage() {
  return (
    <div className="flex h-full items-center justify-center p-20">
      <IllustratedMessage
        size="xs"
        image={<SvgImage src={actionsImage} />}
        title={<Trans message="No element selected" />}
        description={
          <Trans message="Select an element to configure its actions and behaviors" />
        }
      />
    </div>
  );
}

function HoverActionConfigForm({actionType}: {actionType: string}) {
  switch (actionType) {
    case 'tooltip':
      return (
        <div className="space-y-16">
          <TextField
            name="text"
            label={<Trans message="Tooltip Text" />}
            placeholder="Enter tooltip content"
            required
          />
          <Select name="position" label={<Trans message="Position" />} selectionMode="single">
            <Item value="top">Top</Item>
            <Item value="bottom">Bottom</Item>
            <Item value="left">Left</Item>
            <Item value="right">Right</Item>
          </Select>
        </div>
      );
    case 'style':
      return (
        <div className="space-y-16">
          <TextField
            name="property"
            label={<Trans message="CSS Property" />}
            placeholder="background-color, transform, etc."
            required
          />
          <TextField
            name="value"
            label={<Trans message="Hover Value" />}
            placeholder="red, scale(1.1), etc."
            required
          />
          <TextField
            name="duration"
            label={<Trans message="Transition Duration" />}
            placeholder="0.3s"
            defaultValue="0.3s"
          />
        </div>
      );
    case 'scale':
      return (
        <div className="space-y-16">
          <TextField
            name="scale"
            label={<Trans message="Scale Factor" />}
            placeholder="1.1 for 10% larger"
            type="number"
            step="0.1"
            defaultValue="1.1"
          />
          <TextField
            name="duration"
            label={<Trans message="Duration" />}
            placeholder="0.3s"
            defaultValue="0.3s"
          />
        </div>
      );
    default:
      return null;
  }
}

function FormActionConfigForm({actionType}: {actionType: string}) {
  switch (actionType) {
    case 'email':
      return (
        <div className="space-y-16">
          <TextField
            name="recipient"
            label={<Trans message="Recipient Email" />}
            placeholder="admin@example.com"
            type="email"
            required
          />
          <TextField
            name="subject"
            label={<Trans message="Email Subject" />}
            placeholder="New form submission"
            required
          />
          <TextField
            name="template"
            label={<Trans message="Email Template" />}
            placeholder="Custom email template (optional)"
          />
        </div>
      );
    case 'webhook':
      return (
        <div className="space-y-16">
          <TextField
            name="url"
            label={<Trans message="Webhook URL" />}
            placeholder="https://api.example.com/webhook"
            type="url"
            required
          />
          <Select name="method" label={<Trans message="HTTP Method" />} selectionMode="single">
            <Item value="POST">POST</Item>
            <Item value="PUT">PUT</Item>
            <Item value="PATCH">PATCH</Item>
          </Select>
          <TextField
            name="headers"
            label={<Trans message="Custom Headers (JSON)" />}
            placeholder='{"Authorization": "Bearer token"}'
          />
        </div>
      );
    case 'validation':
      return (
        <div className="space-y-16">
          <TextField
            name="field"
            label={<Trans message="Field Name" />}
            placeholder="email, name, etc."
            required
          />
          <Select name="rule" label={<Trans message="Validation Rule" />} selectionMode="single">
            <Item value="required">Required</Item>
            <Item value="email">Email Format</Item>
            <Item value="minLength">Minimum Length</Item>
            <Item value="maxLength">Maximum Length</Item>
            <Item value="pattern">Custom Pattern</Item>
          </Select>
          <TextField
            name="value"
            label={<Trans message="Rule Value" />}
            placeholder="Depends on rule type"
          />
          <TextField
            name="message"
            label={<Trans message="Error Message" />}
            placeholder="This field is required"
          />
        </div>
      );
    default:
      return null;
  }
}

function AnimationActionConfigForm({actionType}: {actionType: string}) {
  switch (actionType) {
    case 'fade':
      return (
        <div className="space-y-16">
          <Select name="trigger" label={<Trans message="Trigger" />} selectionMode="single">
            <Item value="scroll">On Scroll Into View</Item>
            <Item value="load">On Page Load</Item>
            <Item value="click">On Click</Item>
          </Select>
          <TextField
            name="duration"
            label={<Trans message="Duration (ms)" />}
            placeholder="1000"
            type="number"
            defaultValue="1000"
          />
          <TextField
            name="delay"
            label={<Trans message="Delay (ms)" />}
            placeholder="0"
            type="number"
            defaultValue="0"
          />
        </div>
      );
    case 'slide':
      return (
        <div className="space-y-16">
          <Select name="direction" label={<Trans message="Direction" />} selectionMode="single">
            <Item value="up">Slide Up</Item>
            <Item value="down">Slide Down</Item>
            <Item value="left">Slide Left</Item>
            <Item value="right">Slide Right</Item>
          </Select>
          <TextField
            name="distance"
            label={<Trans message="Distance (px)" />}
            placeholder="100"
            type="number"
            defaultValue="100"
          />
          <TextField
            name="duration"
            label={<Trans message="Duration (ms)" />}
            placeholder="800"
            type="number"
            defaultValue="800"
          />
        </div>
      );
    case 'bounce':
      return (
        <div className="space-y-16">
          <TextField
            name="intensity"
            label={<Trans message="Bounce Intensity" />}
            placeholder="1.2 for 20% bounce"
            type="number"
            step="0.1"
            defaultValue="1.2"
          />
          <TextField
            name="duration"
            label={<Trans message="Duration (ms)" />}
            placeholder="600"
            type="number"
            defaultValue="600"
          />
          <TextField
            name="repeat"
            label={<Trans message="Repeat Count" />}
            placeholder="1"
            type="number"
            defaultValue="1"
          />
        </div>
      );
    default:
      return null;
  }
}

function DataDrivenNavigationForm({ onSubmit }: { onSubmit: (action: any) => void }) {
  const [targetPage, setTargetPage] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [dataField, setDataField] = useState('');
  const [navigationTrigger, setNavigationTrigger] = useState('click');

  const handleSubmit = () => {
    onSubmit({
      type: 'data-driven-navigation',
      config: {
        targetPage,
        dataSource,
        dataField,
        trigger: navigationTrigger
      }
    });
  };

  return (
    <div className="space-y-20">
      {/* Simple explanation */}
      <div className="rounded-lg bg-primary/5 p-16">
        <h4 className="mb-8 font-medium text-primary">
          <Trans message="How Data-Driven Navigation Works" />
        </h4>
        <div className="space-y-8 text-sm text-muted">
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">1</div>
            <div>
              <Trans message="User clicks on this element (like a list item or card)" />
            </div>
          </div>
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">2</div>
            <div>
              <Trans message="The data from that item gets picked up (like the contact's name, ID, etc.)" />
            </div>
          </div>
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">3</div>
            <div>
              <Trans message="Navigate to the target page with that data available to use" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16">
        <TextField
          label={<Trans message="What triggers the navigation?" />}
          value={navigationTrigger}
          onChange={(e) => setNavigationTrigger(e.target.value)}
          placeholder="click, double-click, hover"
        />

        <TextField
          label={<Trans message="Which page to go to?" />}
          value={targetPage}
          onChange={(e) => setTargetPage(e.target.value)}
          placeholder="contact-details, product-page, user-profile"
        />
      </div>

      <div className="grid grid-cols-2 gap-16">
        <TextField
          label={<Trans message="What data to bring along?" />}
          value={dataSource}
          onChange={(e) => setDataSource(e.target.value)}
          placeholder="contacts, products, users"
        />

        <TextField
          label={<Trans message="Which field identifies the item?" />}
          value={dataField}
          onChange={(e) => setDataField(e.target.value)}
          placeholder="id, slug, email"
        />
      </div>

      {/* Preview */}
      {targetPage && dataSource && (
        <div className="rounded-lg border bg-background p-12">
          <h5 className="mb-8 font-medium">
            <Trans message="Preview" />
          </h5>
          <p className="text-sm text-muted">
            <Trans 
              message="When someone :trigger this element, they'll go to ':page' with the :data data loaded and ready to use."
              values={{
                trigger: navigationTrigger === 'click' ? 'clicks' : navigationTrigger + 's',
                page: targetPage,
                data: dataSource
              }}
            />
          </p>
        </div>
      )}

      <div className="flex justify-end gap-8">
        <Button variant="flat" color="primary" onClick={handleSubmit}>
          <Trans message="Add Navigation Action" />
        </Button>
      </div>
    </div>
  );
}

function UserDrivenNavigationForm({ onSubmit }: { onSubmit: (action: any) => void }) {
  const [targetPage, setTargetPage] = useState('');
  const [userDataToInclude, setUserDataToInclude] = useState<string[]>([]);
  const [navigationTrigger, setNavigationTrigger] = useState('click');
  const [filterType, setFilterType] = useState('user-specific');

  const availableUserData = [
    { id: 'profile', name: 'Profile Info', description: 'Name, email, avatar' },
    { id: 'preferences', name: 'User Preferences', description: 'Settings, theme, language' },
    { id: 'activity', name: 'User Activity', description: 'Recent actions, history' },
    { id: 'relationships', name: 'User Relationships', description: 'Friends, contacts, teams' }
  ];

  const handleSubmit = () => {
    onSubmit({
      type: 'user-driven-navigation',
      config: {
        targetPage,
        userDataToInclude,
        trigger: navigationTrigger,
        filterType
      }
    });
  };

  return (
    <div className="space-y-20">
      {/* Simple explanation */}
      <div className="rounded-lg bg-positive/5 p-16">
        <h4 className="mb-8 font-medium text-positive">
          <Trans message="How User-Driven Navigation Works" />
        </h4>
        <div className="space-y-8 text-sm text-muted">
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium">1</div>
            <div>
              <Trans message="User clicks this element (like 'My Dashboard' or 'My Orders')" />
            </div>
          </div>
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium">2</div>
            <div>
              <Trans message="The system knows who the user is and grabs their personal data" />
            </div>
          </div>
          <div className="flex items-start gap-8">
            <div className="mt-2 h-6 w-6 rounded-full bg-positive/20 flex items-center justify-center text-xs font-medium">3</div>
            <div>
              <Trans message="Navigate to the page with only their data showing (like only their orders)" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16">
        <TextField
          label={<Trans message="What triggers the navigation?" />}
          value={navigationTrigger}
          onChange={(e) => setNavigationTrigger(e.target.value)}
          placeholder="click, double-click"
        />

        <TextField
          label={<Trans message="Which page to go to?" />}
          value={targetPage}
          onChange={(e) => setTargetPage(e.target.value)}
          placeholder="my-dashboard, my-orders, my-profile"
        />
      </div>

      <div>
        <label className="mb-8 block text-sm font-medium">
          <Trans message="What user data should be available on the target page?" />
        </label>
        <div className="grid grid-cols-2 gap-8">
          {availableUserData.map((data) => (
            <label key={data.id} className="flex items-start gap-8 rounded border p-12 hover:bg-hover cursor-pointer">
              <input
                type="checkbox"
                checked={userDataToInclude.includes(data.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUserDataToInclude([...userDataToInclude, data.id]);
                  } else {
                    setUserDataToInclude(userDataToInclude.filter(id => id !== data.id));
                  }
                }}
                className="mt-2"
              />
              <div>
                <div className="font-medium">{data.name}</div>
                <div className="text-xs text-muted">{data.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-8 block text-sm font-medium">
          <Trans message="How should the data be filtered?" />
        </label>
        <div className="space-y-8">
          <label className="flex items-center gap-8 cursor-pointer">
            <input
              type="radio"
              name="filterType"
              value="user-specific"
              checked={filterType === 'user-specific'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            <div>
              <div className="font-medium">
                <Trans message="Show only this user's data" />
              </div>
              <div className="text-xs text-muted">
                <Trans message="Like showing only their orders, their contacts, their files" />
              </div>
            </div>
          </label>
          <label className="flex items-center gap-8 cursor-pointer">
            <input
              type="radio"
              name="filterType"
              value="personalized"
              checked={filterType === 'personalized'}
              onChange={(e) => setFilterType(e.target.value)}
            />
            <div>
              <div className="font-medium">
                <Trans message="Show personalized content" />
              </div>
              <div className="text-xs text-muted">
                <Trans message="Like recommendations, suggested content, customized dashboard" />
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Preview */}
      {targetPage && userDataToInclude.length > 0 && (
        <div className="rounded-lg border bg-background p-12">
          <h5 className="mb-8 font-medium">
            <Trans message="Preview" />
          </h5>
          <p className="text-sm text-muted">
            <Trans 
              message="When someone clicks this, they'll go to ':page' with their :data loaded and :filter."
              values={{
                page: targetPage,
                data: userDataToInclude.join(', '),
                filter: filterType === 'user-specific' ? 'showing only their personal data' : 'showing personalized content'
              }}
            />
          </p>
        </div>
      )}

      <div className="flex justify-end gap-8">
        <Button 
          variant="flat" 
          color="primary" 
          onClick={handleSubmit}
          disabled={!targetPage || userDataToInclude.length === 0}
        >
          <Trans message="Add User Navigation Action" />
        </Button>
      </div>
    </div>
  );
} 