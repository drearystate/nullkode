<?php namespace App\Http\Controllers;

use Common\Core\BaseController;
use Exception;
use Illuminate\Support\Facades\File;
use Symfony\Component\DomCrawler\Crawler;

class ElementsController extends BaseController
{
    public function custom()
    {
        $files = File::files(public_path('builder/elements'));
        $module = '';

        foreach ($files as $key => $file) {
            try {
                $crawler = new Crawler(File::get($file));
                $script = trim(
                    $crawler
                        ->filter('script')
                        ->first()
                        ->html(),
                );
                $template = trim(
                    $crawler
                        ->filter('template')
                        ->first()
                        ->html(),
                );
                $styleTag = $crawler->filter('style')->first();
                if ($styleTag->count()) {
                    $style = trim($styleTag->html());
                }
                $module .= $script;
                if (isset($style)) {
                    $module .= "export const style$key = `$style`;";
                }
                if ($template) {
                    $module .= "export const template$key = `$template`;";
                }
            } catch (Exception $e) {
                //
            }
        }

        return response($module)->header('Content-Type', 'text/javascript');
    }
}
