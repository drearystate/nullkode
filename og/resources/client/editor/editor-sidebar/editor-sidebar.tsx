import {forwardRef, ReactElement, useEffect, useRef} from 'react';
import {Trans} from '@common/i18n/trans';
import {IconButton} from '@common/ui/buttons/icon-button';
import {KeyboardArrowLeftIcon} from '@common/icons/material/KeyboardArrowLeft';
import {Link} from 'react-router-dom';
import {Tooltip} from '@common/ui/tooltip/tooltip';
import {ExtensionIcon} from '@common/icons/material/Extension';
import {StyleIcon} from '@common/icons/material/Style';
import {LayersIcon} from '@common/icons/material/Layers';
import {SettingsIcon} from '@common/icons/material/Settings';
import {CodeIcon} from '@common/icons/material/Code';
import {editorState, useEditorStore} from '@app/editor/state/editor-store';
import {ElementsPanel} from '@app/editor/editor-sidebar/elements-panel';
import {SidebarPanel} from '@app/editor/editor-sidebar/sidebar-panel';
import {ActionsToolbar} from '@app/editor/editor-sidebar/actions-toolbar';
import {HistoryIcon} from '@common/icons/material/History';
import {InspectorPanel} from '@app/editor/editor-sidebar/inspector-panel/inspector-panel';
import {HistoryPanel} from '@app/editor/editor-sidebar/history-panel';
import {MessageDescriptor} from '@common/i18n/message-descriptor';
import {observeSize} from '@common/utils/dom/observe-size';
import {LayoutEditorPanel} from '@app/editor/editor-sidebar/layout-editor/layout-editor-panel';
import {PagesPanel} from '@app/editor/editor-sidebar/pages-panel/pages-panel';
import {DescriptionIcon} from '@common/icons/material/Description';
import {ButtonBase} from '@common/ui/buttons/button-base';
import {KeyboardArrowRightIcon} from '@common/icons/material/KeyboardArrowRight';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {CustomCodeDialog} from '@app/editor/editor-sidebar/custom-code-dialog';
import {ProjectSettingsDialog} from '@app/projects/project-settings-dialog/project-settings-dialog';
import {Project} from '@app/dashboard/project';

interface Props {
  project?: Project;
}
export function EditorSidebar({project}: Props) {
  const ref = useRef<HTMLDivElement>(null!);
  const sidebarIsVisible = useEditorStore(s => s.sidebarIsVisible);
  const sidebarWidth = useEditorStore(s => s.sidebarWidth);

  useEffect(() => {
    return observeSize(ref, () => {
      editorState().syncIframeRect();
    });
  }, []);

  return (
    <div
      ref={ref}
      className="relative z-20 flex w-350 flex-shrink-0 bg-background shadow-xl transition-[margin]"
      style={{
        marginLeft: sidebarIsVisible ? undefined : `-${sidebarWidth}`,
      }}
    >
      <ButtonBase
        className="absolute bottom-1/2 left-full top-1/2 z-10 h-40 w-14 -translate-y-1/2 items-center rounded-r border-y border-r bg shadow-[3px_1px_3px_rgba(0,0,0,.05)]"
        onClick={() => {
          editorState().setSidebarIsVisible(!sidebarIsVisible);
        }}
      >
        {sidebarIsVisible ? (
          <KeyboardArrowLeftIcon size="xs" />
        ) : (
          <KeyboardArrowRightIcon size="xs" />
        )}
      </ButtonBase>
      <nav className="flex flex-shrink-0 flex-col items-center gap-8 border-r pt-8">
        <Tooltip
          label={<Trans message="Dashboard" />}
          delay={300}
          placement="right"
        >
          <IconButton
            elementType={Link}
            to="/dashboard"
            display="flex"
            radius="rounded-none"
            className="mb-18 text-muted"
          >
            <KeyboardArrowLeftIcon />
          </IconButton>
        </Tooltip>
        <NavItemLayout icon={<ExtensionIcon />} panel={SidebarPanel.ELEMENTS}>
          <Trans message="Elements" />
        </NavItemLayout>
        <NavItemLayout icon={<LayersIcon />} panel={SidebarPanel.LAYOUT}>
          <Trans message="Layout" />
        </NavItemLayout>
        <NavItemLayout icon={<StyleIcon />} panel={SidebarPanel.STYLE}>
          <Trans message="Style" />
        </NavItemLayout>
        <NavItemLayout icon={<DescriptionIcon />} panel={SidebarPanel.PAGES}>
          <Trans message="Pages" />
        </NavItemLayout>
        {project && (
          <DialogTrigger type="modal">
            <NavItemLayout
              icon={<SettingsIcon />}
              panel={SidebarPanel.SETTINGS}
            >
              <Trans message="Settings" />
            </NavItemLayout>
            <ProjectSettingsDialog project={project} />
          </DialogTrigger>
        )}
        <DialogTrigger type="modal">
          <NavItemLayout icon={<CodeIcon />}>
            <Trans message="Code" />
          </NavItemLayout>
          <CustomCodeDialog />
        </DialogTrigger>
        <NavItemLayout icon={<HistoryIcon />} panel={SidebarPanel.HISTORY}>
          <Trans message="History" />
        </NavItemLayout>
      </nav>
      <aside className="relative flex h-full min-w-0 flex-auto flex-col">
        <div className="compact-scrollbar flex-auto overflow-y-auto">
          <SelectedPanel />
        </div>
        {project && <ActionsToolbar project={project} />}
      </aside>
    </div>
  );
}

function SelectedPanel() {
  const activePanel = useEditorStore(s => s.activePanel);
  switch (activePanel) {
    case SidebarPanel.ELEMENTS:
      return <ElementsPanel />;
    case SidebarPanel.STYLE:
      return <InspectorPanel />;
    case SidebarPanel.HISTORY:
      return <HistoryPanel />;
    case SidebarPanel.LAYOUT:
      return <LayoutEditorPanel />;
    case SidebarPanel.PAGES:
      return <PagesPanel />;
  }
}

interface NavItemLayoutProps {
  icon: ReactElement;
  children: ReactElement<MessageDescriptor>;
  panel?: SidebarPanel;
}
const NavItemLayout = forwardRef<HTMLButtonElement, NavItemLayoutProps>(
  ({icon, children, panel, ...dialogTriggerProps}, ref) => {
    const activeTab = useEditorStore(s => s.activePanel);
    return (
      <Tooltip label={children} delay={300} placement="right">
        <IconButton
          ref={ref}
          size={null}
          className="h-48 w-48"
          radius="rounded-none"
          color={activeTab === panel ? 'primary' : undefined}
          onClick={
            panel ? () => editorState().setActivePanel(panel) : undefined
          }
          {...dialogTriggerProps}
        >
          {icon}
        </IconButton>
      </Tooltip>
    );
  },
);
