import {Trans} from '@common/i18n/trans';
import {Button} from '@common/ui/buttons/button';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import publishImage from '@app/projects/project-settings-dialog/publish.svg';
import {Project} from '@app/dashboard/project';
import {PublishDestinationPanel} from '@app/projects/project-settings-dialog/publish-destination-panel';
import {useUpdateProjectSettings} from '@app/projects/use-update-project-settings';
import {toast} from '@common/ui/toast/toast';
import {message} from '@common/i18n/message';
import {SectionHelper} from '@common/ui/section-helper';
import {useAuth} from '@common/auth/use-auth';

interface PublishingSettingsProps {
  project: Project;
}
export function PublishingSettings({project}: PublishingSettingsProps) {
  return (
    <div>
      <SectionHelper
        className="mb-18"
        description={
          <Trans message="All the ways your site can be viewed online. You can prevent this site from being accessible online by unpublishing it below." />
        }
        color="neutral"
      />
      <StatusPanel project={project} />
      <PublishDestinationPanel project={project} />
    </div>
  );
}

function StatusPanel({project}: PublishingSettingsProps) {
  const toggleState = useUpdateProjectSettings(project.id);
  const {hasPermission} = useAuth();
  return (
    <div className="flex items-center gap-24 rounded-panel border border-primary-light/30 bg-primary-light/10 p-14">
      <SvgImage src={publishImage} className="max-w-90" />
      <div>
        <div className="mb-8">
          {project.published ? (
            <Trans message="Your site is published" />
          ) : (
            <Trans message="Your site is not published" />
          )}
        </div>
        <Button
          variant="outline"
          color="primary"
          size="xs"
          disabled={
            toggleState.isPending ||
            (!project.published && !hasPermission('projects.publish'))
          }
          onClick={() =>
            toggleState.mutate(
              {
                published: !project.published,
              },
              {
                onSuccess: response => {
                  toast(
                    response.project.published
                      ? message('Project published')
                      : message('Project unpublished'),
                  );
                },
              },
            )
          }
        >
          {project.published ? (
            <Trans message="Unpublish" />
          ) : (
            <Trans message="Publish" />
          )}
        </Button>
      </div>
    </div>
  );
}
