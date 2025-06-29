<?php namespace App\Http\Controllers;

use App\Models\AiHistoryItem;
use Common\Core\BaseController;
use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\StoreFile;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Support\Facades\Auth;
use OpenAI;

class AiController extends BaseController
{
    protected OpenAI\Client $client;

    public function __construct()
    {
        $this->middleware('auth');
        $this->client = OpenAI::client(config('services.openai.api_key'));
    }

    public function modifyText()
    {
        $this->authorize('text', 'AI');

        $data = $this->validate(request(), [
            'text' => 'required|string|min:10|max:3000',
            'instruction' =>
                'required|string|in:simplify,shorten,lengthen,fixSpelling,changeTone,translate',
            'tone' => 'required_if:instruction,changeTone|string',
            'language' => 'required_if:instruction,translate|string',
        ]);

        if ($data['instruction'] === 'translate') {
            $instruction = "Translate the following text to {$data['language']}:";
        } elseif ($data['instruction'] === 'changeTone') {
            $instruction = match ($data['tone']) {
                'casual' => 'Change the tone of the following text to casual:',
                'formal' => 'Change the tone of the following text to formal:',
                'confident'
                    => 'Change the tone of the following text to confident:',
                'friendly'
                    => 'Change the tone of the following text to friendly:',
                'inspirational'
                    => 'Change the tone of the following text to inspirational:',
                'motivational'
                    => 'Change the tone of the following text to motivational:',
                'nostalgic'
                    => 'Change the tone of the following text to nostalgic:',
                'professional'
                    => 'Change the tone of the following text to professional:',
                'playful'
                    => 'Change the tone of the following text to playful:',
                'scientific'
                    => 'Change the tone of the following text to scientific:',
                'witty' => 'Change the tone of the following text to witty:',
                'straightforward'
                    => 'Change the tone of the following text to straightforward:',
            };
            if (!$instruction) {
                return $this->error('Invalid tone provided');
            }
        } else {
            $instruction = match ($data['instruction']) {
                'simplify' => 'Simplify the following text:',
                'shorten' => 'Shorten the following text:',
                'lengthen' => 'make the following text longer:',
                'fixSpelling'
                    => 'Fix spelling and grammar of the following text:',
                default => '',
            };
        }

        $prompt = "{$instruction} {$data['text']}";

        $apiResponse = $this->client->chat()->create([
            'model' => 'gpt-3.5-turbo',
            'temperature' => 1,
            'messages' => [
                [
                    'role' => 'system',
                    'content' =>
                        'You are an assistant helping a web content writer refine text content.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ],
        ]);

        $response = [
            'tokens' => $apiResponse->usage->totalTokens,
            'content' => $apiResponse->choices[0]->message->content,
        ];

        Auth::user()
            ->aiHistory()
            ->create([
                'type' => AiHistoryItem::MODIFY_TEXT,
                'prompt' => $prompt,
                'response' => $response['content'],
                'tokens_used' => $response['tokens'],
            ]);

        return $this->success($response);
    }

    public function generateText()
    {
        $this->authorize('text', 'AI');

        $data = $this->validate(request(), [
            'prompt' => 'required|string|min:10|max:3000',
        ]);

        $apiResponse = $this->client->chat()->create([
            'model' => 'gpt-3.5-turbo',
            'temperature' => 1.5,
            'max_tokens' => 3000,
            'messages' => [
                [
                    'role' => 'system',
                    'content' =>
                        'You are an assistant helping a web content writer generate a title or paragraph for their website.',
                ],
                [
                    'role' => 'user',
                    'content' => $data['prompt'],
                ],
            ],
        ]);

        $response = [
            'tokens' => $apiResponse->usage->totalTokens,
            'content' => trim($apiResponse->choices[0]->message->content, '"'),
        ];

        Auth::user()
            ->aiHistory()
            ->create([
                'type' => AiHistoryItem::GENERATE_TEXT,
                'prompt' => $data['prompt'],
                'response' => $response['content'],
                'tokens_used' => $response['tokens'],
            ]);

        return $this->success($response);
    }

    public function generateImage()
    {
        $this->authorize('images', 'AI');

        $data = $this->validate(request(), [
            'prompt' => 'required|string|min:10|max:3000',
            'size' => 'nullable|string',
            'style' => 'nullable|string',
        ]);

        $style =
            !isset($data['style']) || $data['style'] === 'none'
                ? false
                : $data['style'];

        $prompt = $style
            ? "Generate a $style {$data['prompt']}"
            : $data['prompt'];

        $apiResponse = $this->client->images()->create([
            'model' => 'dall-e-3',
            'prompt' => $prompt,
            'n' => 1,
            'size' => $data['size'] ?? '1024x1024',
            'response_format' => 'url',
        ]);

        $response = [
            'tokens' => 1,
            'url' => $apiResponse->data[0]->url,
            'b64_json' => $apiResponse->data[0]->b64_json,
            'size' => $data['size'] ?? '1024x1024',
        ];

        Auth::user()
            ->aiHistory()
            ->create([
                'type' => AiHistoryItem::GENERATE_IMAGE,
                'prompt' => $prompt,
                'response' => '',
                'tokens_used' => $response['tokens'],
            ]);

        return $this->success($response);
    }

    public function uploadGeneratedImage()
    {
        $this->authorize('store', FileEntry::class);

        $data = $this->validate(request(), [
            'url' => 'required|string',
        ]);

        $fileData = file_get_contents($data['url']);

        $payload = new FileEntryPayload([
            'clientName' => 'ai-generated-image.jpg',
            'clientExtension' => 'jpg',
            'clientMime' => 'image/jpeg',
            'size' => strlen($fileData),
            'disk' => 'public',
            'diskPrefix' => 'project-assets',
        ]);

        app(StoreFile::class)->execute($payload, ['contents' => $fileData]);

        $fileEntry = app(CreateFileEntry::class)->execute($payload);

        return $this->success(['fileEntry' => $fileEntry]);
    }
}
