<?php
/**
 * Plugin Name: CreatorNew Tools Sitemap
 * Description: Adds CreatorNew static tool pages to Rank Math's sitemap index.
 * Version: 1.0.0
 * Author: CreatorNew
 * License: GPL-2.0-or-later
 */

defined( 'ABSPATH' ) || exit;

add_action( 'plugins_loaded', function () {
	if ( ! interface_exists( '\\RankMath\\Sitemap\\Providers\\Provider' ) ) {
		return;
	}

final class CreatorNew_Tools_Sitemap_Provider implements \RankMath\Sitemap\Providers\Provider {
	private function get_tools() {
		$file  = plugin_dir_path( __FILE__ ) . 'tools.json';
		$tools = is_readable( $file ) ? json_decode( file_get_contents( $file ), true ) : array();
		return is_array( $tools ) ? array_values( array_filter( $tools, 'is_string' ) ) : array();
	}

	private function get_links() {
		$links = array();

		foreach ( $this->get_tools() as $slug ) {
			$slug       = sanitize_title( $slug );
			$index_file = trailingslashit( ABSPATH ) . $slug . '/index.html';

			// Only publish URLs whose static tool entry file exists on this hosting account.
			if ( ! is_file( $index_file ) ) {
				continue;
			}

			$links[] = array(
				'loc' => home_url( '/' . $slug . '/' ),
				'mod' => gmdate( DATE_W3C, filemtime( $index_file ) ),
			);
		}

		return $links;
	}

	public function handles_type( $type ) {
		return 'tools' === $type;
	}

	public function get_index_links( $max_entries ) {
		$links   = $this->get_links();
		$mod_dates = wp_list_pluck( $links, 'mod' );

		return array(
			array(
				'loc'     => \RankMath\Sitemap\Router::get_base_url( 'tools-sitemap.xml' ),
				'lastmod' => $mod_dates ? max( $mod_dates ) : '',
			),
		);
	}

	public function get_sitemap_links( $type, $max_entries, $current_page ) {
		return $this->get_links();
	}
}

add_filter(
	'rank_math/sitemap/providers',
	function ( $providers ) {
		$providers['tools'] = new CreatorNew_Tools_Sitemap_Provider();
		return $providers;
	}
);
}, 20 );

register_activation_hook(
	__FILE__,
	function () {
		flush_rewrite_rules();
	}
);

register_deactivation_hook(
	__FILE__,
	function () {
		flush_rewrite_rules();
	}
);
