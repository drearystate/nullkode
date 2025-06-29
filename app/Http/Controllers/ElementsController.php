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
        // Sort files to ensure consistent order between backend and frontend
        usort($files, function($a, $b) {
            return strcmp($a->getFilename(), $b->getFilename());
        });
        
        $module = '';
        $index = 0;

        foreach ($files as $file) {
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
                $module .= $script . "\n";
                if (isset($style)) {
                    $module .= "export const style$index = `$style`;\n";
                    unset($style); // Clear for next iteration
                }
                if ($template) {
                    $module .= "export const template$index = `$template`;\n";
                }
                $index++;
            } catch (Exception $e) {
                //
            }
        }

        return response($module)->header('Content-Type', 'text/javascript');
    }
}
