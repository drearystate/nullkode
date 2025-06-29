import {Trans} from '@common/i18n/trans';
import {useTemplates} from '@app/templates/use-templates';
import {TextField} from '@common/ui/forms/input-field/text-field/text-field';
import {useTrans} from '@common/i18n/use-trans';
import {message} from '@common/i18n/message';
import {SearchIcon} from '@common/icons/material/Search';
import {Select} from '@common/ui/forms/select/select';
import {Item} from '@common/ui/forms/listbox/item';
import {useSettings} from '@common/core/settings/use-settings';
import {Button} from '@common/ui/buttons/button';
import {Footer} from '@common/ui/footer/footer';
import React, {useState} from 'react';
import {AnimatePresence} from 'framer-motion';
import {
  TemplateGridItemLayout,
  TemplateGridLayout,
  TemplateGridSkeletons,
} from '@app/templates/template-grid-layout';
import {IllustratedMessage} from '@common/ui/images/illustrated-message';
import {PageErrorMessage} from '@common/errors/page-error-message';
import {UseInfiniteDataResult} from '@common/ui/infinite-scroll/use-infinite-data';
import {BuilderTemplate} from '@app/templates/builder-template';
import {SvgImage} from '@common/ui/images/svg-image/svg-image';
import websiteBuilderImage from '@app/templates/website-builder.svg';
import {ProgressCircle} from '@common/ui/progress/progress-circle';
import {InfiniteScrollSentinel} from '@common/ui/infinite-scroll/infinite-scroll-sentinel';
import {DialogTrigger} from '@common/ui/overlays/dialog/dialog-trigger';
import {NewProjectDialog} from '@app/projects/new-project-dialog';
import {DashboardNavbar} from '@app/dashboard/dashboard-navbar';
import {Link} from 'react-router-dom';
import {StaticPageTitle} from '@common/seo/static-page-title';

export function NewProjectPage() {
  return (
    <div>
      <StaticPageTitle>
        <Trans message="New site" />
      </StaticPageTitle>
      <DashboardNavbar />
      <div className="container mx-auto mt-40 px-20">
        <div>
          <h1 className="text-3xl font-medium">
            <Trans message="Choose a template for your project" />
          </h1>
          <p className="mt-2 text-muted">
            <Trans message="All templates are 100% customizable so choose one then make it your own." />
          </p>
        </div>
        <TemplateForm />
        <Footer />
      </div>
    </div>
  );
}

function TemplateForm() {
  const {trans} = useTrans();
  const {builder} = useSettings();
  const [selectedCategory, setSelectedCategory] = useState('');
  const query = useTemplates({category: selectedCategory, perPage: 24});
  return (
    <div className="mt-20 md:mt-40">
      <section className="items-center justify-between gap-12 md:flex">
        <div className="flex-auto items-center gap-12 md:flex">
          <TextField
            placeholder={trans(message('Search...'))}
            startAdornment={<SearchIcon />}
            className="min-w-288 max-md:mb-12"
            value={query.searchQuery}
            onChange={e => query.setSearchQuery(e.target.value)}
            endAdornment={
              query.isReloading &&
              query.searchQuery && <ProgressCircle isIndeterminate size="xs" />
            }
          />
          <Select
            selectionMode="single"
            name="category"
            className="min-w-288 max-md:mb-12"
            floatingWidth="matchTrigger"
            selectedValue={selectedCategory}
            onItemSelected={value => setSelectedCategory(value as string)}
          >
            <Item value="">
              <Trans message="All categories" />
            </Item>
            {builder?.template_categories?.map(category => (
              <Item key={category} value={category}>
                <Trans message={category} />
              </Item>
            ))}
          </Select>
        </div>
        <DialogTrigger type="modal">
          <Button variant="flat" color="primary" className="min-h-42">
            <Trans message="Start with blank page" />
          </Button>
          <NewProjectDialog />
        </DialogTrigger>
      </section>
      <div className="my-20 min-h-440">
        <AnimatePresence initial={false} mode="wait">
          <TemplateGrid query={query} />
        </AnimatePresence>
        {query.items.length && <InfiniteScrollSentinel query={query} />}
      </div>
    </div>
  );
}

interface TemplateGridProps {
  query: UseInfiniteDataResult<BuilderTemplate>;
}
function TemplateGrid({
  query: {items, isLoading, isReloading, noResults},
}: TemplateGridProps) {
  if (items.length) {
    return (
      <TemplateGridLayout animationKey="templates">
        {items.map(template => (
          <TemplateGridItemLayout
            key={template.name}
            label={template.name.replace(/-/g, ' ')}
            className="group"
          >
            <div className="relative cursor-pointer">
              <img
                className="aspect-[365/228] w-full object-cover"
                src={template.thumbnail}
                alt=""
              />
              <div className="absolute inset-0 hidden flex-col items-center justify-center gap-16 bg-white/90 group-hover:flex">
                <Button
                  variant="outline"
                  color="primary"
                  className="min-w-124"
                  elementType={Link}
                  to={template.name}
                >
                  <Trans message="View" />
                </Button>
                <DialogTrigger type="modal" key={template.name}>
                  <Button variant="flat" color="primary" className="min-w-124">
                    <Trans message="Select" />
                  </Button>
                  <NewProjectDialog templateName={template.name} />
                </DialogTrigger>
              </div>
            </div>
          </TemplateGridItemLayout>
        ))}
      </TemplateGridLayout>
    );
  }

  if (isLoading && !isReloading) {
    return (
      <TemplateGridLayout animationKey="skeletons">
        <TemplateGridSkeletons />
      </TemplateGridLayout>
    );
  }

  if (noResults) {
    return (
      <IllustratedMessage
        className="my-80"
        size="sm"
        title={<Trans message="No matching templates" />}
        description={<Trans message="Try another search query or category" />}
        image={<SvgImage src={websiteBuilderImage} />}
      />
    );
  }

  return <PageErrorMessage />;
}
