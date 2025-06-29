import {Dialog} from '@common/ui/overlays/dialog/dialog';
import {DialogHeader} from '@common/ui/overlays/dialog/dialog-header';
import {Trans} from '@common/i18n/trans';
import {DialogBody} from '@common/ui/overlays/dialog/dialog-body';
import {Project} from '@app/dashboard/project';
import {Tabs} from '@common/ui/tabs/tabs';
import {TabList} from '@common/ui/tabs/tab-list';
import {Tab} from '@common/ui/tabs/tab';
import {TabPanel, TabPanels} from '@common/ui/tabs/tab-panels';
import {PublishingSettings} from '@app/projects/project-settings-dialog/publishing-settings';
import {useProject} from '@app/projects/use-project';
import {useState} from 'react';
import {ProjectFormsPanel} from '@app/projects/project-settings-dialog/project-forms-panel';
import {ExportProjectPanel} from '@app/projects/project-settings-dialog/export-project-panel';

interface ProjectSettingsDialogProps {
  project: Project;
}
export function ProjectSettingsDialog({
  project: initialData,
}: ProjectSettingsDialogProps) {
  const {data} = useProject(initialData.id, initialData);
  const [selectedTab, setSelectedTab] = useState(0);
  return (
    <Dialog size="lg">
      <DialogHeader>
        <Trans message="Project settings" />
      </DialogHeader>
      <DialogBody>
        <Tabs selectedTab={selectedTab} onTabChange={setSelectedTab}>
          <TabList>
            <Tab>
              <Trans message="Publishing" />
            </Tab>
            <Tab>
              <Trans message="Forms" />
            </Tab>
            <Tab>
              <Trans message="Export" />
            </Tab>
          </TabList>
          <TabPanels className="pt-14">
            <TabPanel>
              <PublishingSettings project={data.project} />
            </TabPanel>
            <TabPanel>
              <ProjectFormsPanel project={data.project} />
            </TabPanel>
            <TabPanel>
              <ExportProjectPanel project={data.project} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </DialogBody>
    </Dialog>
  );
}
