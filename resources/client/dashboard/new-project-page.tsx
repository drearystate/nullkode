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
        <Trans message="New project" />
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
  const [selectedSection, setSelectedSection] = useState<'webapp' | 'website' | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const query = useTemplates({category: selectedCategory, perPage: 24});

  // Define categories for each section
  const websiteCategories = ['Website Templates', 'Landing Page', 'Blog', 'Portfolio', 'Business', 'Creative'];
  const webappCategories = ['Web App Templates', 'Dashboard', 'SaaS', 'Admin Panel', 'E-commerce'];
  const allCategories = builder?.template_categories || [];

  const handleSectionSelect = (section: 'webapp' | 'website') => {
    setSelectedSection(section);
    // Set default category for the section
    if (section === 'webapp') {
      setSelectedCategory('Web App Templates');
    } else {
      setSelectedCategory('Website Templates');
    }
  };

  const resetSelection = () => {
    setSelectedSection('');
    setSelectedCategory('');
  };

  // If no section is selected, show the section chooser
  if (!selectedSection) {
    return (
      <div className="mt-20 md:mt-40">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-medium mb-4">What type of project do you want to create?</h2>
          <p className="text-muted">Choose the category that best fits your project needs</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Web Apps Section */}
          <div 
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-300"
            onClick={() => handleSectionSelect('webapp')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Web Applications</h3>
              <p className="text-gray-600 mb-6">Interactive applications with user authentication, dashboards, and dynamic functionality</p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• Dashboard Templates</div>
                <div>• SaaS Applications</div>
                <div>• Admin Panels</div>
                <div>• E-commerce Apps</div>
              </div>
              <button className="mt-6 w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors">
                Choose Web App Templates
              </button>
            </div>
          </div>

          {/* Websites Section */}
          <div 
            className="bg-white rounded-xl border-2 border-gray-200 p-8 cursor-pointer hover:border-green-500 hover:shadow-lg transition-all duration-300"
            onClick={() => handleSectionSelect('website')}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9a9 9 0 00-9 9m0 0l5.657-5.657M12 12l5.657 5.657" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Websites</h3>
              <p className="text-gray-600 mb-6">Static and content-focused websites for marketing, portfolios, and information sharing</p>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• Landing Pages</div>
                <div>• Business Websites</div>
                <div>• Portfolios</div>
                <div>• Blogs</div>
              </div>
              <button className="mt-6 w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors">
                Choose Website Templates
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show templates for selected section
  const currentCategories = selectedSection === 'webapp' ? webappCategories : websiteCategories;
  const availableCategories = allCategories.filter(cat => currentCategories.includes(cat));

  return (
    <div className="mt-20 md:mt-40">
      {/* Back button and section header */}
      <div className="mb-8">
        <button 
          onClick={resetSelection}
          className="flex items-center text-blue-500 hover:text-blue-600 mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to project types
        </button>
        <h2 className="text-2xl font-medium">
          {selectedSection === 'webapp' ? 'Web Application Templates' : 'Website Templates'}
        </h2>
        <p className="text-muted mt-2">
          {selectedSection === 'webapp' 
            ? 'Choose a template for your web application with built-in functionality' 
            : 'Choose a template for your website or landing page'
          }
        </p>
      </div>

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
            {availableCategories.map(category => (
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
