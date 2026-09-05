<?php
/**
 * Plugin Name: CreatorNew Prompt Sync
 * Description: Synchronizes public-domain prompts from prompts.chat for the CreatorNew AI Prompt Builder.
 * Version: 1.2.1
 * Author: CreatorNew
 */

if (!defined('ABSPATH')) {
    exit;
}

const CREATORNEW_PROMPT_SYNC_HOOK = 'creatornew_prompt_sync_daily';
const CREATORNEW_PROMPT_API = 'https://prompts.chat/api/prompts?perPage=48';
const CREATORNEW_PROMPT_CSV = 'https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv';
const CREATORNEW_USEFUL_INDEX = 'https://raw.githubusercontent.com/aj-geddes/useful-ai-prompts/main/PROMPT-INDEX.json';
const CREATORNEW_USEFUL_RAW = 'https://raw.githubusercontent.com/aj-geddes/useful-ai-prompts/main/';
const CREATORNEW_RISE_JSON = 'https://raw.githubusercontent.com/RISE-UNIBAS/prompt-library/main/prompts.json';

function creatornew_prompt_sync_output_path() {
    return trailingslashit(ABSPATH) . 'data/prompts-chat.json';
}

function creatornew_prompt_sync_request($url, $accept) {
    $response = wp_remote_get($url, array(
        'timeout' => 25,
        'redirection' => 3,
        'headers' => array(
            'Accept' => $accept,
            'User-Agent' => 'CreatorNew Prompt Sync/1.0; ' . home_url('/'),
        ),
    ));
    if (is_wp_error($response)) {
        return $response;
    }
    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) {
        return new WP_Error('creatornew_prompt_http', 'Source returned HTTP ' . $status . '.');
    }
    return wp_remote_retrieve_body($response);
}

function creatornew_prompt_sync_api_items($payload) {
    if (isset($payload['prompts']) && is_array($payload['prompts'])) return $payload['prompts'];
    if (isset($payload['data']['prompts']) && is_array($payload['data']['prompts'])) return $payload['data']['prompts'];
    if (isset($payload['data']) && is_array($payload['data'])) return $payload['data'];
    if (isset($payload['items']) && is_array($payload['items'])) return $payload['items'];
    return $payload && array_keys($payload) === range(0, count($payload) - 1) ? $payload : array();
}

function creatornew_prompt_sync_from_api() {
    $body = creatornew_prompt_sync_request(CREATORNEW_PROMPT_API, 'application/json');
    if (is_wp_error($body)) return $body;
    $payload = json_decode($body, true);
    if (!is_array($payload)) return new WP_Error('creatornew_prompt_json', 'The API returned invalid JSON.');
    $items = array_slice(creatornew_prompt_sync_api_items($payload), 0, 48);
    return $items ? array('source' => CREATORNEW_PROMPT_API, 'prompts' => $items) : new WP_Error('creatornew_prompt_empty', 'The API returned no prompts.');
}

function creatornew_prompt_sync_from_csv() {
    $body = creatornew_prompt_sync_request(CREATORNEW_PROMPT_CSV, 'text/csv');
    if (is_wp_error($body)) return $body;
    $stream = fopen('php://temp', 'r+');
    fwrite($stream, $body);
    rewind($stream);
    $headers = fgetcsv($stream);
    if (!$headers) { fclose($stream); return new WP_Error('creatornew_prompt_csv', 'The CSV header is invalid.'); }
    $headers = array_map(function ($value) { return strtolower(trim($value)); }, $headers);
    $items = array();
    while (($columns = fgetcsv($stream)) !== false && count($items) < 48) {
        $row = array();
        foreach ($headers as $index => $header) $row[$header] = isset($columns[$index]) ? $columns[$index] : '';
        $content = isset($row['prompt']) ? trim($row['prompt']) : (isset($row['content']) ? trim($row['content']) : '');
        if (!$content) continue;
        $items[] = array(
            'id' => 'csv-' . (count($items) + 1),
            'title' => !empty($row['act']) ? $row['act'] : (!empty($row['title']) ? $row['title'] : 'Community Prompt'),
            'content' => $content,
            'description' => 'Official community prompt from prompts.chat',
            'sourceUrl' => 'https://prompts.chat/',
        );
    }
    fclose($stream);
    return $items ? array('source' => CREATORNEW_PROMPT_CSV, 'prompts' => $items) : new WP_Error('creatornew_prompt_csv_empty', 'The CSV returned no prompts.');
}

function creatornew_prompt_sync_from_useful() {
    $body = creatornew_prompt_sync_request(CREATORNEW_USEFUL_INDEX, 'application/json');
    if (is_wp_error($body)) return $body;
    $payload = json_decode($body, true);
    if (!isset($payload['prompts']) || !is_array($payload['prompts'])) return new WP_Error('creatornew_useful_index', 'Useful AI Prompts returned an invalid index.');
    $preferred = array_values(array_filter($payload['prompts'], function ($item) {
        $category = strtolower(isset($item['category']) ? $item['category'] : '');
        return strpos($category, 'content') !== false || strpos($category, 'creative') !== false || strpos($category, 'marketing') !== false || strpos($category, 'productivity') !== false || strpos($category, 'communication') !== false;
    }));
    $items = array();
    foreach (array_slice($preferred, 0, 8) as $item) {
        if (empty($item['file_path']) || empty($item['title'])) continue;
        $prompt_body = creatornew_prompt_sync_request(CREATORNEW_USEFUL_RAW . ltrim($item['file_path'], '/'), 'text/plain');
        if (is_wp_error($prompt_body) || strlen(trim($prompt_body)) < 40) continue;
        $prompt_body = preg_replace('/\A---\s*.*?\s*---\s*/s', '', $prompt_body);
        $items[] = array(
            'id' => 'useful-' . (isset($item['slug']) ? $item['slug'] : count($items) + 1),
            'title' => $item['title'],
            'content' => trim($prompt_body),
            'description' => isset($item['description']) ? $item['description'] : 'Production-ready prompt from Useful AI Prompts.',
            'category' => isset($item['category']) ? $item['category'] : 'productivity',
            'tags' => isset($item['tags']) && is_array($item['tags']) ? $item['tags'] : array(),
            'model' => isset($item['compatible_models'][0]) ? $item['compatible_models'][0] : 'General AI',
            'sourceName' => 'Useful AI Prompts',
            'sourceUrl' => 'https://github.com/aj-geddes/useful-ai-prompts/blob/main/' . ltrim($item['file_path'], '/'),
            'license' => 'MIT',
        );
    }
    return $items ? $items : new WP_Error('creatornew_useful_empty', 'Useful AI Prompts returned no usable prompts.');
}

function creatornew_prompt_sync_from_rise() {
    $body = creatornew_prompt_sync_request(CREATORNEW_RISE_JSON, 'application/json');
    if (is_wp_error($body)) return $body;
    $payload = json_decode($body, true);
    if (!is_array($payload)) return new WP_Error('creatornew_rise_json', 'RISE Prompt Library returned invalid JSON.');
    $items = array();
    foreach ($payload as $item) {
        if (empty($item['dcterms:title']) || empty($item['prompt_text'])) continue;
        $items[] = array(
            'id' => isset($item['dcterms:identifier']) ? strtolower($item['dcterms:identifier']) : 'rise-' . (count($items) + 1),
            'title' => $item['dcterms:title'],
            'content' => $item['prompt_text'],
            'description' => isset($item['dcterms:description']) ? $item['dcterms:description'] : 'Research prompt from the University of Basel.',
            'category' => isset($item['dcterms:subject']) ? $item['dcterms:subject'] : 'research',
            'model' => isset($item['dcterms:relation'][0]) ? $item['dcterms:relation'][0] : 'General AI',
            'sourceName' => 'RISE University of Basel',
            'sourceUrl' => isset($item['dcterms:isPartOf']) ? $item['dcterms:isPartOf'] : 'https://github.com/RISE-UNIBAS/prompt-library',
            'license' => isset($item['dcterms:rights']) ? $item['dcterms:rights'] : 'CC BY 4.0',
        );
    }
    return $items ? $items : new WP_Error('creatornew_rise_empty', 'RISE Prompt Library returned no usable prompts.');
}

function creatornew_prompt_sync_run() {
    $result = creatornew_prompt_sync_from_api();
    if (is_wp_error($result)) $result = creatornew_prompt_sync_from_csv();
    $prompts = is_wp_error($result) ? array() : $result['prompts'];
    foreach ($prompts as &$prompt) {
        if (!isset($prompt['sourceName'])) $prompt['sourceName'] = 'prompts.chat';
        if (!isset($prompt['sourceUrl'])) $prompt['sourceUrl'] = 'https://prompts.chat/';
        if (!isset($prompt['license'])) $prompt['license'] = 'CC0';
    }
    unset($prompt);
    $useful = creatornew_prompt_sync_from_useful();
    if (!is_wp_error($useful)) $prompts = array_merge($prompts, $useful);
    $rise = creatornew_prompt_sync_from_rise();
    if (!is_wp_error($rise)) $prompts = array_merge($prompts, $rise);
    $unique = array();
    foreach ($prompts as $prompt) {
        $key = strtolower(trim(isset($prompt['title']) ? $prompt['title'] : ''));
        if ($key && !isset($unique[$key])) $unique[$key] = $prompt;
    }
    $prompts = array_values($unique);
    if (!$prompts) {
        $message = is_wp_error($result) ? $result->get_error_message() : 'All prompt sources returned no data.';
        update_option('creatornew_prompt_sync_error', $message, false);
        return new WP_Error('creatornew_prompt_all_sources', $message);
    }
    $directory = dirname(creatornew_prompt_sync_output_path());
    if (!wp_mkdir_p($directory)) return new WP_Error('creatornew_prompt_directory', 'Cannot create the /data directory.');
    $document = array(
        'updatedAt' => gmdate('c'),
        'source' => 'Multiple open prompt libraries',
        'sources' => array(
            array('name' => 'prompts.chat', 'license' => 'CC0', 'url' => 'https://prompts.chat/'),
            array('name' => 'Useful AI Prompts', 'license' => 'MIT', 'url' => 'https://github.com/aj-geddes/useful-ai-prompts'),
            array('name' => 'RISE University of Basel', 'license' => 'CC BY 4.0', 'url' => 'https://github.com/RISE-UNIBAS/prompt-library'),
        ),
        'license' => 'CC0, MIT and CC BY 4.0',
        'prompts' => $prompts,
    );
    $written = file_put_contents(creatornew_prompt_sync_output_path(), wp_json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
    if ($written === false) return new WP_Error('creatornew_prompt_write', 'Cannot write /data/prompts-chat.json. Check folder permissions.');
    update_option('creatornew_prompt_sync_last_run', time(), false);
    update_option('creatornew_prompt_sync_count', count($prompts), false);
    delete_option('creatornew_prompt_sync_error');
    return count($prompts);
}

add_action(CREATORNEW_PROMPT_SYNC_HOOK, 'creatornew_prompt_sync_run');

add_filter('cron_schedules', function ($schedules) {
    $schedules['creatornew_every_30_minutes'] = array(
        'interval' => 30 * MINUTE_IN_SECONDS,
        'display' => 'Every 30 minutes',
    );
    return $schedules;
});

function creatornew_prompt_sync_schedule() {
    $version = get_option('creatornew_prompt_sync_schedule_version', '');
    if ($version !== '1.2.1') {
        wp_clear_scheduled_hook(CREATORNEW_PROMPT_SYNC_HOOK);
        wp_schedule_event(time() + 60, 'creatornew_every_30_minutes', CREATORNEW_PROMPT_SYNC_HOOK);
        update_option('creatornew_prompt_sync_schedule_version', '1.2.1', false);
    } elseif (!wp_next_scheduled(CREATORNEW_PROMPT_SYNC_HOOK)) {
        wp_schedule_event(time() + 60, 'creatornew_every_30_minutes', CREATORNEW_PROMPT_SYNC_HOOK);
    }
}

add_action('init', 'creatornew_prompt_sync_schedule');

register_activation_hook(__FILE__, function () {
    wp_clear_scheduled_hook(CREATORNEW_PROMPT_SYNC_HOOK);
    wp_schedule_event(time() + 60, 'creatornew_every_30_minutes', CREATORNEW_PROMPT_SYNC_HOOK);
    update_option('creatornew_prompt_sync_schedule_version', '1.2.1', false);
});

register_deactivation_hook(__FILE__, function () {
    wp_clear_scheduled_hook(CREATORNEW_PROMPT_SYNC_HOOK);
});

add_action('admin_menu', function () {
    add_management_page('CreatorNew Prompt Sync', 'CreatorNew Prompt Sync', 'manage_options', 'creatornew-prompt-sync', 'creatornew_prompt_sync_admin_page');
});

function creatornew_prompt_sync_admin_page() {
    if (!current_user_can('manage_options')) return;
    $notice = '';
    if (isset($_POST['creatornew_prompt_sync_now'])) {
        check_admin_referer('creatornew_prompt_sync_now');
        $result = creatornew_prompt_sync_run();
        $notice = is_wp_error($result) ? '<div class="notice notice-error"><p>' . esc_html($result->get_error_message()) . '</p></div>' : '<div class="notice notice-success"><p>Synced ' . intval($result) . ' prompts successfully.</p></div>';
    }
    $last_run = intval(get_option('creatornew_prompt_sync_last_run', 0));
    $count = intval(get_option('creatornew_prompt_sync_count', 0));
    $error = get_option('creatornew_prompt_sync_error', '');
    echo '<div class="wrap"><h1>CreatorNew Prompt Sync</h1>' . wp_kses_post($notice);
    echo '<p><strong>Prompt file:</strong> <code>/data/prompts-chat.json</code></p>';
    echo '<p><strong>Last successful sync:</strong> ' . ($last_run ? esc_html(wp_date('Y-m-d H:i:s', $last_run)) : 'Never') . '</p>';
    echo '<p><strong>Saved prompts:</strong> ' . $count . '</p>';
    if ($error) echo '<p><strong>Latest error:</strong> ' . esc_html($error) . '</p>';
    echo '<form method="post">';
    wp_nonce_field('creatornew_prompt_sync_now');
    submit_button('Sync Prompts Now', 'primary', 'creatornew_prompt_sync_now');
    $next_run = wp_next_scheduled(CREATORNEW_PROMPT_SYNC_HOOK);
    echo '</form><p><strong>Schedule:</strong> Every 30 minutes through WP-Cron.</p>';
    echo '<p><strong>Next scheduled run:</strong> ' . ($next_run ? esc_html(wp_date('Y-m-d H:i:s', $next_run)) : 'Not scheduled') . '</p></div>';
}
