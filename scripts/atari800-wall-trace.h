#ifndef DARKFIGHTER_TRACE_H
#define DARKFIGHTER_TRACE_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "input.h"
#include "pia.h"
#include "screen.h"

#define DFTRACE_PAL_FRAME_CYCLES 35568u
#define DFTRACE_GAMEPLAY_TOP 24u
#define DFTRACE_RING_SCREEN 0x4050u
#define DFTRACE_RING_END 0x43c0u
#define DFTRACE_PICKUP_GLYPH_BASE 120u
#define DFTRACE_ENGINE_ALLIED_GLYPH 83u
#define DFTRACE_ENGINE_ENEMY_GLYPH 84u
#define DFTRACE_ENGINE_ALLIED_CODE 0x53u
#define DFTRACE_ENGINE_ENEMY_CODE 0xd4u
#define DFTRACE_CHARSET 0x4400u
#define DFTRACE_PROFILE_COUNT 22u
#define DFTRACE_PROFILE_DLI_COUNT 2u

typedef struct {
	uint64_t start_clock;
	uint64_t end_clock;
	uint64_t next_start_clock;
	unsigned start_host_frame;
	unsigned end_host_frame;
	unsigned next_start_host_frame;
	int start_y;
	int start_x;
	int end_y;
	int end_x;
	unsigned dli_nmis;
	unsigned events;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned projectiles;
	unsigned broadside;
	unsigned far_rendered;
	unsigned live_raider;
	unsigned fighter_explosion;
	unsigned capital_explosion;
	unsigned music_active;
	unsigned fire_sfx;
	unsigned hit_sfx;
	unsigned capital_sfx;
	unsigned sound_enabled;
	unsigned player_lifecycle;
	unsigned player_x;
	unsigned player_y;
	unsigned prior;
	unsigned player_erase_calls;
	unsigned player_draw_calls;
	unsigned player_erase_scanline;
	unsigned player_draw_scanline;
	unsigned sector_state;
	unsigned gameplay_frame;
	unsigned difficulty;
	unsigned active_muzzles;
	unsigned entity_active;
	unsigned entity_x;
	unsigned entity_y;
	unsigned entity_vx;
	unsigned entity_move_accumulator;
	unsigned entity_vertical_accumulator;
	unsigned entity_render_id;
	unsigned entity_active_mask;
	unsigned pickup_state;
	unsigned pickup_booster_state;
	unsigned pickup_counter;
	unsigned pickup_x;
	unsigned pickup_y;
	unsigned pickup_timer_lo;
	unsigned pickup_timer_hi;
	unsigned pickup_animation;
	unsigned pickup_render_id;
	unsigned pickup_drawn_mask;
	unsigned score_lo;
	unsigned score_hi;
	unsigned colbk;
	unsigned colpm0;
	unsigned colpm1;
	unsigned colpm2;
	unsigned colpm3;
	unsigned colpf0;
	unsigned colpf1;
	unsigned colpf2;
	unsigned colpf3;
	unsigned viper_explosion_timer;
	unsigned enemy_explosion_timer;
	unsigned effect_active_mask;
	unsigned effect_active_count;
	unsigned effect_rendered_mask;
	unsigned rapid_projectiles;
	unsigned viper_projectiles;
	unsigned rapid_projectile_slot;
	unsigned rapid_projectile_address;
	unsigned rapid_projectile_screen_code;
	unsigned rapid_projectile_backing;
	unsigned dli_sequence_violations;
	unsigned maximum_dlis_per_host_frame;
	unsigned pause_test_completed;
	unsigned pause_timer_before;
	unsigned pause_timer_after;
	unsigned pause_engine_timer_before;
	unsigned pause_engine_timer_after;
	unsigned pause_engine_phase_before;
	unsigned pause_engine_phase_after;
	unsigned pause_host_frames;
	unsigned pickup_prev_x;
	unsigned pickup_prev_y;
	unsigned pickup_prev_render_row;
	unsigned pickup_prev_render_phase;
	unsigned pickup_render_row;
	unsigned pickup_render_phase;
	unsigned pickup_vscroll;
	unsigned pickup_a2_head;
	unsigned pickup_erase_calls;
	unsigned pickup_draw_calls;
	unsigned pickup_erase_scanline;
	unsigned pickup_erase_cycle;
	unsigned pickup_draw_scanline;
	unsigned pickup_draw_cycle;
	unsigned pickup_old_address[6];
	unsigned pickup_old_backing[6];
	unsigned pickup_old_before_erase[6];
	unsigned pickup_old_after_erase[6];
	unsigned pickup_new_address[6];
	unsigned pickup_new_backing[6];
	unsigned pickup_new_after_draw[6];
	unsigned pickup_glyph_cells_before;
	unsigned pickup_glyph_cells_after;
	unsigned pickup_footprints_before;
	unsigned pickup_footprints_after;
	unsigned pickup_first_overwrite_pc;
	unsigned pickup_first_overwrite_address;
	unsigned pickup_first_overwrite_value;
	unsigned pickup_first_overwrite_scanline;
	unsigned engine_timer;
	unsigned engine_phase;
	unsigned corridor_phase;
	unsigned ring_flags;
	unsigned engine_vscroll;
	unsigned engine_a2_head;
	unsigned engine_allied_cells;
	unsigned engine_enemy_cells;
	unsigned engine_copy_calls;
	unsigned engine_copy_scanline;
	unsigned engine_copy_cycle;
	unsigned engine_first_write_pc;
	unsigned engine_first_write_address;
	unsigned engine_first_write_old;
	unsigned engine_first_write_new;
	unsigned engine_first_write_scanline;
	unsigned engine_first_write_cycle;
	unsigned engine_charset_hash;
	unsigned engine_displayed_dlist_lo;
	unsigned engine_published_dlist_lo;
	unsigned engine_active_dlist_lo;
	unsigned engine_next_dlist_lo;
	unsigned engine_row0_address;
	unsigned engine_displayed_row0_address;
	unsigned engine_active_row0_address;
	unsigned engine_divider[8];
	unsigned engine_recycled[8];
	unsigned engine_first_dlist_write_pc;
	unsigned engine_first_dlist_write_address;
	unsigned engine_first_dlist_write_old;
	unsigned engine_first_dlist_write_new;
	unsigned engine_first_dlist_write_scanline;
	unsigned engine_first_dlist_write_cycle;
	unsigned engine_first_recycled_write_pc;
	unsigned engine_first_recycled_write_address;
	unsigned engine_first_recycled_write_old;
	unsigned engine_first_recycled_write_new;
	unsigned engine_first_recycled_write_scanline;
	unsigned engine_first_recycled_write_cycle;
	unsigned engine_playfield_select_calls;
	unsigned engine_playfield_select_scanline;
	unsigned engine_playfield_select_cycle;
	unsigned engine_playfield_select_dlist;
	unsigned engine_playfield_select_active_lo;
	unsigned gameplay_generation;
	uint64_t profile_clock[DFTRACE_PROFILE_COUNT];
	uint64_t profile_dli_start[DFTRACE_PROFILE_DLI_COUNT];
	uint64_t profile_dli_end[DFTRACE_PROFILE_DLI_COUNT];
	unsigned profile_dli_segment[DFTRACE_PROFILE_DLI_COUNT];
	unsigned profile_next;
	unsigned profile_dli_count;
	unsigned profile_compose_calls;
	unsigned profile_compose_cycles;
	unsigned profile_pointer_calls;
	unsigned profile_pointer_cycles;
	uint64_t profile_erase_viper_start;
	uint64_t profile_raider_update_start;
	uint64_t profile_raider_render_start;
	uint64_t profile_entity_erase_start;
	uint64_t profile_effect_update_end;
	uint64_t profile_pickup_update_end;
	uint64_t profile_pickup_render_start;
	uint64_t profile_effect_render_start;
} DFTraceFrame;

enum {
	DFTRACE_EVENT_WORLD = 1u << 0,
	DFTRACE_EVENT_FAR_ERASE = 1u << 1,
	DFTRACE_EVENT_HULL = 1u << 2,
	DFTRACE_EVENT_BROADSIDE = 1u << 3,
	DFTRACE_EVENT_FIGHTER_EXPLOSION = 1u << 4,
	DFTRACE_EVENT_CAPITAL_EXPLOSION = 1u << 5,
	DFTRACE_EVENT_MUSIC_TICK = 1u << 6,
	DFTRACE_EVENT_ENTITY_SPAWN = 1u << 7,
	DFTRACE_EVENT_ENTITY_CONTACT = 1u << 8,
	DFTRACE_EVENT_ENTITY_DESPAWN = 1u << 9,
	DFTRACE_EVENT_NEAR_STEP = 1u << 10,
	DFTRACE_EVENT_FAR_STEP = 1u << 11,
	DFTRACE_EVENT_ENTITY_SHOT = 1u << 12,
	DFTRACE_EVENT_EFFECT_SPAWN = 1u << 13,
	DFTRACE_EVENT_EFFECT_ERASE = 1u << 14,
	DFTRACE_EVENT_EFFECT_UPDATE = 1u << 15,
	DFTRACE_EVENT_EFFECT_RENDER = 1u << 16,
	DFTRACE_EVENT_RAIDER_BREAKUP_SPAWN = 1u << 17,
	DFTRACE_EVENT_PICKUP_QUALIFIED_KILL = 1u << 18,
	DFTRACE_EVENT_PICKUP_COLLECT = 1u << 19,
	DFTRACE_EVENT_DIRECTOR_WORLD = 1u << 20,
	DFTRACE_EVENT_DIRECTOR_REQUEST = 1u << 21,
	DFTRACE_EVENT_DIRECTOR_EVENT = 1u << 22
};

static int dftrace_initialised;
static int dftrace_active;
static unsigned dftrace_count;
static unsigned dftrace_limit;
static unsigned dftrace_fire_delay;
static unsigned dftrace_difficulty;
static const char *dftrace_policy;
static const char *dftrace_session;
static const char *dftrace_output;
static DFTraceFrame *dftrace_frames;
static DFTraceFrame dftrace_current;

static unsigned dftrace_pc_active;
static unsigned dftrace_pc_end;
static unsigned dftrace_pc_profile[DFTRACE_PROFILE_COUNT];
static unsigned dftrace_pc_dli_end;
static unsigned dftrace_pc_dli_hud_end;
static unsigned dftrace_pc_compose_start;
static unsigned dftrace_pc_compose_end;
static unsigned dftrace_pc_pointer_start;
static unsigned dftrace_pc_pointer_end;
static unsigned dftrace_pc_erase_slot;
static unsigned dftrace_pc_raider_update_start;
static unsigned dftrace_pc_render_slot;
static unsigned dftrace_pc_entity_erase_start;
static unsigned dftrace_pc_effect_update_end;
static unsigned dftrace_pc_pickup_update_end;
static uint64_t dftrace_compose_start_clock;
static uint64_t dftrace_pointer_start_clock;
static unsigned dftrace_pc_frontend_poll;
static unsigned dftrace_pc_dli;
static unsigned dftrace_pc_world;
static unsigned dftrace_pc_near;
static unsigned dftrace_pc_far_erase;
static unsigned dftrace_pc_far_step;
static unsigned dftrace_pc_hull;
static unsigned dftrace_pc_broadside;
static unsigned dftrace_pc_fighter_explosion;
static unsigned dftrace_pc_capital_explosion;
static unsigned dftrace_pc_music_tick;
static unsigned dftrace_pc_entity_spawn;
static unsigned dftrace_pc_entity_contact;
static unsigned dftrace_pc_entity_despawn;
static unsigned dftrace_pc_entity_shot;
static unsigned dftrace_pc_effect_spawn;
static unsigned dftrace_pc_effect_erase;
static unsigned dftrace_pc_effect_update;
static unsigned dftrace_pc_effect_render;
static unsigned dftrace_pc_raider_breakup_spawn;
static unsigned dftrace_pc_pickup_qualified_kill;
static unsigned dftrace_pc_pickup_collect;
static unsigned dftrace_pc_director_world;
static unsigned dftrace_pc_director_request;
static unsigned dftrace_pc_director_event;
static unsigned dftrace_pc_entity_erase;
static unsigned dftrace_pc_after_entity_erase;
static unsigned dftrace_pc_entity_draw;
static unsigned dftrace_pc_player_erase;
static unsigned dftrace_pc_player_draw;
static unsigned dftrace_pc_engine_update;
static unsigned dftrace_pc_engine_copy;
static unsigned dftrace_pc_gameplay_init;
static unsigned dftrace_pc_dlist_publish;
static unsigned dftrace_pc_rotate_start;
static unsigned dftrace_pc_rotate_end;
static unsigned dftrace_dli_phase;

static unsigned dftrace_player_x;
static unsigned dftrace_player_y;
static unsigned dftrace_projectile_active;
static unsigned dftrace_projectile_rendered;
static unsigned dftrace_projectile_screen_lo;
static unsigned dftrace_projectile_screen_hi;
static unsigned dftrace_projectile_backing_top;
static unsigned dftrace_broad_state;
static unsigned dftrace_broad_schedule_timer;
static unsigned dftrace_broad_schedule_index;
static unsigned dftrace_broad_visible_scrolls;
static unsigned dftrace_broad_turret_fired;
static unsigned dftrace_corridor_phase;
static unsigned dftrace_capital_drain_rows;
static int dftrace_broadside_proof_admitted;
static int dftrace_broadside_proof_sector_started;
static unsigned dftrace_far_active;
static unsigned dftrace_enemy_active;
static unsigned dftrace_enemy_x;
static unsigned dftrace_fighter_explosion_timer;
static unsigned dftrace_capital_explosion_timer;
static unsigned dftrace_music_active;
static unsigned dftrace_fire_timer;
static unsigned dftrace_hit_timer;
static unsigned dftrace_capital_sound_timer;
static unsigned dftrace_sound_enabled;
static unsigned dftrace_player_lifecycle;
static unsigned dftrace_sector_state;
static unsigned dftrace_game_state;
static unsigned dftrace_frontend_selection;
static unsigned dftrace_frontend_input_armed;
static unsigned dftrace_difficulty_setting;
static unsigned dftrace_gameplay_frame;
static unsigned dftrace_muzzle_screen_hi;
static unsigned dftrace_muzzle_screen_lo;
static unsigned dftrace_entity_active_count;
static unsigned dftrace_entity_x;
static unsigned dftrace_entity_y;
static unsigned dftrace_entity_vx;
static unsigned dftrace_entity_vy;
static unsigned dftrace_entity_move_accumulator;
static unsigned dftrace_entity_vertical_accumulator;
static unsigned dftrace_entity_render_id;
static unsigned dftrace_entity_active_mask;
static unsigned dftrace_entity_state;
static unsigned dftrace_entity_hp;
static unsigned dftrace_entity_timer;
static unsigned dftrace_entity_owner;
static unsigned dftrace_entity_drawn_mask;
static unsigned dftrace_entity_screen_lo;
static unsigned dftrace_entity_screen_hi;
static unsigned dftrace_entity_backing0;
static unsigned dftrace_entity_backing1;
static unsigned dftrace_entity_backing2;
static unsigned dftrace_entity_backing3;
static unsigned dftrace_playfield_row_lo;
static unsigned dftrace_playfield_row_hi;
static unsigned dftrace_score_lo;
static unsigned dftrace_score_hi;
static unsigned dftrace_effect_active_mask;
static unsigned dftrace_effect_active_count;
static unsigned dftrace_effect_rendered_mask;
static unsigned dftrace_engine_timer;
static unsigned dftrace_engine_phase;
static unsigned dftrace_corridor_phase;
static unsigned dftrace_ring_flags;
static unsigned dftrace_active_dlist_lo;
static unsigned dftrace_next_dlist_lo;
static const char *dftrace_engine_screenshot_prefix;
static unsigned dftrace_engine_screenshot_count;
static unsigned dftrace_engine_screenshot_generation;
static unsigned dftrace_gameplay_generation;
static int dftrace_restart_game_over_seeded;
static unsigned dftrace_previous_pc;
static unsigned dftrace_engine_previous[16];
static int dftrace_engine_previous_valid;
static unsigned dftrace_frontend_delay;
static unsigned dftrace_published_dlist_lo;
static unsigned dftrace_displayed_dlist_lo;
static unsigned dftrace_display_host_frame = 0xffffffffu;
static unsigned dftrace_display_list_previous[75];
static int dftrace_display_list_previous_valid;
static unsigned dftrace_recycled_previous[40];
static int dftrace_recycled_previous_valid;
static const char *dftrace_pickup_screenshot;
static unsigned dftrace_pickup_screenshot_frame = 0xffffffffu;
static unsigned dftrace_pickup_visible_passes;
static const char *dftrace_pickup_sequence_prefix;
static unsigned dftrace_pickup_sequence_count;
static unsigned dftrace_pickup_sequence_primed;
static const char *dftrace_pickup_traversal_prefix;
static unsigned dftrace_pickup_traversal_count;
static unsigned dftrace_pickup_traversal_last_y = 0xffffffffu;
static unsigned dftrace_pickup_hunt_active_frames;
static const char *dftrace_pickup_contact_prefix;
static unsigned dftrace_pickup_contact_count;
static unsigned dftrace_pickup_contact_after_collect;
static const char *dftrace_rapid_screenshot;
static unsigned dftrace_rapid_screenshot_frame = 0xffffffffu;
static const char *dftrace_spread_screenshot;
static unsigned dftrace_spread_screenshot_frame = 0xffffffffu;
static int dftrace_dli_integrity_enabled;
static unsigned dftrace_dli_integrity_host_frame = 0xffffffffu;
static unsigned dftrace_dli_integrity_count;
static int dftrace_dli_integrity_complete_frame_seen;
static unsigned dftrace_dli_sequence_violations;
static unsigned dftrace_maximum_dlis_per_host_frame;
static int dftrace_pause_test_enabled;
static unsigned dftrace_pause_stage;
static unsigned dftrace_pause_press_host;
static unsigned dftrace_pause_enter_host = 0xffffffffu;
static unsigned dftrace_pause_timer_before;
static unsigned dftrace_pause_timer_after;
static unsigned dftrace_pause_engine_timer_before;
static unsigned dftrace_pause_engine_timer_after;
static unsigned dftrace_pause_engine_phase_before;
static unsigned dftrace_pause_engine_phase_after;
static unsigned dftrace_pause_host_frames;
static unsigned dftrace_pause_test_completed;

typedef struct {
	unsigned frame;
	unsigned pc;
	int scanline;
	int cycle;
	unsigned loader_timer;
	unsigned game_state;
	unsigned dlist;
	unsigned charset_address;
	unsigned pm_base;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned vdslst;
	unsigned runad;
	unsigned initad;
	unsigned dosvec;
	unsigned screen_checksum;
	unsigned frontend_dlist_checksum;
	unsigned loader_dli_count;
} DFBootSnapshot;

static int dfboot_initialised;
static FILE *dfboot_file;
static const char *dfboot_artifact;
static const char *dfboot_screenshot_prefix;
static unsigned dfboot_fill;
static unsigned dfboot_last_frame = 0xffffffffu;
static unsigned dfboot_seen_start = 0xffffffffu;
static unsigned dfboot_seen_loader = 0xffffffffu;
static unsigned dfboot_seen_menu = 0xffffffffu;
static unsigned dfboot_seen_frontend = 0xffffffffu;
static unsigned dfboot_seen_gameplay = 0xffffffffu;
static unsigned dfboot_seen_main = 0xffffffffu;
static unsigned dfboot_pc_start;
static unsigned dfboot_pc_loader;
static unsigned dfboot_pc_menu;
static unsigned dfboot_pc_frontend;
static unsigned dfboot_pc_gameplay;
static unsigned dfboot_pc_main;
static unsigned dfboot_loader_timer;
static unsigned dfboot_game_state;
static unsigned dfboot_main_menu_dlist;
static unsigned dfboot_frontend_dlist_end;
static unsigned dfboot_snapshots_count;
static unsigned dfboot_loader_dli_count;
static DFBootSnapshot dfboot_snapshots[5];

static unsigned dfboot_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "darkfighter boot smoke: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "darkfighter boot smoke: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dfboot_word(unsigned address)
{
	return MEMORY_mem[address] | ((unsigned) MEMORY_mem[address + 1u] << 8);
}

static unsigned dfboot_checksum(unsigned address, unsigned length)
{
	unsigned index;
	unsigned value = 0;
	for (index = 0; index < length; ++index)
		value = value * 33u + MEMORY_mem[(address + index) & 0xffffu];
	return value;
}

static int dfboot_target_frame(unsigned frame)
{
	return frame == 1u || frame == 250u || frame == 300u ||
		frame == 500u || frame == 750u;
}

static void dfboot_capture(unsigned frame, unsigned pc)
{
	DFBootSnapshot *snapshot;
	char screenshot[FILENAME_MAX];
	if (dfboot_snapshots_count >= 5u) {
		fprintf(stderr, "darkfighter boot smoke: too many target frames\n");
		exit(2);
	}
	snapshot = &dfboot_snapshots[dfboot_snapshots_count++];
	memset(snapshot, 0, sizeof(*snapshot));
	snapshot->frame = frame;
	snapshot->pc = pc;
	snapshot->scanline = ANTIC_ypos;
	snapshot->cycle = ANTIC_XPOS;
	snapshot->loader_timer = MEMORY_mem[dfboot_loader_timer];
	snapshot->game_state = MEMORY_mem[dfboot_game_state];
	snapshot->dlist = ANTIC_dlist;
	snapshot->charset_address = (unsigned) ANTIC_CHBASE << 8;
	snapshot->pm_base = (unsigned) ANTIC_PMBASE << 8;
	snapshot->dma_ctl = ANTIC_DMACTL;
	snapshot->nmi_en = ANTIC_NMIEN;
	snapshot->vdslst = dfboot_word(0x0200u);
	snapshot->runad = dfboot_word(0x02e0u);
	snapshot->initad = dfboot_word(0x02e2u);
	snapshot->dosvec = dfboot_word(0x000au);
	snapshot->screen_checksum = dfboot_checksum(0x4000u, 0x0400u);
	snapshot->frontend_dlist_checksum = dfboot_checksum(dfboot_main_menu_dlist,
		dfboot_frontend_dlist_end - dfboot_main_menu_dlist);
	snapshot->loader_dli_count = dfboot_loader_dli_count;
	if (dfboot_screenshot_prefix != NULL && *dfboot_screenshot_prefix != '\0') {
		snprintf(screenshot, sizeof(screenshot), "%s-frame%03u.png",
			dfboot_screenshot_prefix, frame);
		if (!Screen_SaveScreenshot(screenshot, 0)) {
			fprintf(stderr, "darkfighter boot smoke: screenshot failed: %s\n", screenshot);
			exit(2);
		}
	}
}

static void dfboot_write(void)
{
	unsigned index;
	fprintf(dfboot_file,
		"{\n  \"artifact\": \"%s\",\n  \"cold_ram_fill\": %u,\n  \"snapshots\": [\n",
		dfboot_artifact, dfboot_fill);
	for (index = 0; index < dfboot_snapshots_count; ++index) {
		DFBootSnapshot *snapshot = &dfboot_snapshots[index];
		fprintf(dfboot_file,
			"    {\"frame\":%u,\"pc\":%u,\"scanline\":%d,\"cycle\":%d,"
			"\"loader_timer\":%u,\"game_state\":%u,\"dlist\":%u,"
			"\"charset_address\":%u,\"pm_base\":%u,\"dma_ctl\":%u,"
			"\"nmi_en\":%u,\"vdslst\":%u,\"runad\":%u,\"initad\":%u,"
			"\"dosvec\":%u,\"screen_checksum\":%u,"
			"\"frontend_dlist_checksum\":%u,\"loader_dli_count\":%u}%s\n",
			snapshot->frame, snapshot->pc, snapshot->scanline, snapshot->cycle,
			snapshot->loader_timer, snapshot->game_state, snapshot->dlist,
			snapshot->charset_address, snapshot->pm_base, snapshot->dma_ctl,
			snapshot->nmi_en, snapshot->vdslst, snapshot->runad, snapshot->initad,
			snapshot->dosvec, snapshot->screen_checksum,
			snapshot->frontend_dlist_checksum, snapshot->loader_dli_count,
			index + 1u == dfboot_snapshots_count ? "" : ",");
	}
	fprintf(dfboot_file,
		"  ],\n  \"milestones\": {\"start\":%u,\"loader\":%u,\"menu\":%u,"
		"\"frontend_poll\":%u,\"gameplay_init\":%u,\"main_loop\":%u}\n}\n",
		dfboot_seen_start, dfboot_seen_loader, dfboot_seen_menu,
		dfboot_seen_frontend, dfboot_seen_gameplay, dfboot_seen_main);
	if (fclose(dfboot_file) != 0) {
		perror("darkfighter boot smoke close");
		exit(2);
	}
}

static void dfboot_init(void)
{
	unsigned address;
	dfboot_artifact = getenv("DFBOOT_ARTIFACT");
	dfboot_screenshot_prefix = getenv("DFBOOT_SCREENSHOT_PREFIX");
	if (dfboot_artifact == NULL || *dfboot_artifact == '\0') {
		fprintf(stderr, "darkfighter boot smoke: missing DFBOOT_ARTIFACT\n");
		exit(2);
	}
	dfboot_file = fopen(getenv("DFBOOT_OUTPUT"), "w");
	if (dfboot_file == NULL) {
		perror("darkfighter boot smoke output");
		exit(2);
	}
	dfboot_fill = dfboot_env_u("DFBOOT_RAM_FILL");
	if (dfboot_fill > 0xffu) {
		fprintf(stderr, "darkfighter boot smoke: RAM fill exceeds one byte\n");
		exit(2);
	}
	for (address = 0x8000u; address < 0xa000u; ++address)
		MEMORY_mem[address] = (UBYTE) dfboot_fill;
	dfboot_pc_start = dfboot_env_u("DFBOOT_PC_START");
	dfboot_pc_loader = dfboot_env_u("DFBOOT_PC_LOADER");
	dfboot_pc_menu = dfboot_env_u("DFBOOT_PC_MENU");
	dfboot_pc_frontend = dfboot_env_u("DFBOOT_PC_FRONTEND");
	dfboot_pc_gameplay = dfboot_env_u("DFBOOT_PC_GAMEPLAY");
	dfboot_pc_main = dfboot_env_u("DFBOOT_PC_MAIN");
	dfboot_loader_timer = dfboot_env_u("DFBOOT_LOADER_TIMER");
	dfboot_game_state = dfboot_env_u("DFBOOT_GAME_STATE");
	dfboot_main_menu_dlist = dfboot_env_u("DFBOOT_MAIN_MENU_DLIST");
	dfboot_frontend_dlist_end = dfboot_env_u("DFBOOT_FRONTEND_DLIST_END");
	dfboot_initialised = 1;
}

static void dfboot_observe(unsigned pc)
{
	unsigned frame;
	if (!dfboot_initialised)
		dfboot_init();
	frame = (unsigned) Atari800_nframes;
	if (MEMORY_mem[dfboot_game_state] == 0u && pc == dfboot_word(0x0200u))
		++dfboot_loader_dli_count;
	if (pc == dfboot_pc_start && dfboot_seen_start == 0xffffffffu)
		dfboot_seen_start = frame;
	if (pc == dfboot_pc_loader && dfboot_seen_loader == 0xffffffffu)
		dfboot_seen_loader = frame;
	if (pc == dfboot_pc_menu && dfboot_seen_menu == 0xffffffffu &&
		dfboot_seen_loader != 0xffffffffu && MEMORY_mem[dfboot_loader_timer] == 0u)
		dfboot_seen_menu = frame;
	if (pc == dfboot_pc_frontend && dfboot_seen_frontend == 0xffffffffu &&
		MEMORY_mem[dfboot_game_state] == 1u)
		dfboot_seen_frontend = frame;
	if (pc == dfboot_pc_gameplay && dfboot_seen_gameplay == 0xffffffffu)
		dfboot_seen_gameplay = frame;
	if (pc == dfboot_pc_main && dfboot_seen_main == 0xffffffffu)
		dfboot_seen_main = frame;

	/* Drive the production menu input path: neutral through the loader/menu,
	 * then a short FIRE press after the frame-500 proof snapshot. */
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | 0x0fu;
	GTIA_TRIG[0] = (UBYTE) (frame >= 501u && frame <= 506u ? 0 : 1);
	if (frame != dfboot_last_frame) {
		dfboot_last_frame = frame;
		if (dfboot_target_frame(frame))
			dfboot_capture(frame, pc);
		if (frame > 750u) {
			dfboot_write();
			fflush(NULL);
			exit(0);
		}
	}
}

static unsigned dftrace_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "darkfighter trace: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "darkfighter trace: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dftrace_count_nonzero(unsigned address, unsigned length)
{
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < length; ++index)
		if (MEMORY_mem[(address + index) & 0xffffu] != 0)
			++count;
	return count;
}

static unsigned dftrace_count_far_rendered(void)
{
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < 24; ++index)
		if ((MEMORY_mem[dftrace_far_active + index] & 0x80u) != 0)
			++count;
	return count;
}

static int dftrace_pickup_screen_address_valid(unsigned address)
{
	return address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END;
}

static unsigned dftrace_pickup_glyph_cells(void)
{
	unsigned address;
	unsigned count = 0;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		unsigned code = MEMORY_mem[address];
		unsigned index;
		for (index = 0; index < 6u; ++index)
			if (code == ((base + index) & 0xffu)) {
				++count;
				break;
			}
	}
	return count;
}

static unsigned dftrace_pickup_footprints(void)
{
	unsigned address;
	unsigned count = 0;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (MEMORY_mem[address] == base)
			++count;
	return count;
}

static void dftrace_pickup_addresses(unsigned *addresses)
{
	unsigned top = MEMORY_mem[dftrace_entity_screen_lo + 1u] |
		((unsigned) MEMORY_mem[dftrace_entity_screen_hi + 1u] << 8);
	unsigned bottom = MEMORY_mem[dftrace_entity_vx + 1u] |
		((unsigned) MEMORY_mem[dftrace_entity_vy + 1u] << 8);
	addresses[0] = top;
	addresses[1] = (top + 1u) & 0xffffu;
	addresses[2] = bottom;
	addresses[3] = (bottom + 1u) & 0xffffu;
	if (MEMORY_mem[dftrace_entity_screen_hi + 3u] != 0u) {
		unsigned third = MEMORY_mem[dftrace_entity_screen_lo + 3u] |
			((unsigned) MEMORY_mem[dftrace_entity_screen_hi + 3u] << 8);
		addresses[4] = third;
		addresses[5] = (third + 1u) & 0xffffu;
	}
}

static unsigned dftrace_pickup_backing(unsigned index)
{
	static unsigned *const backing_addresses[] = {
		&dftrace_entity_backing0, &dftrace_entity_backing1,
		&dftrace_entity_backing2, &dftrace_entity_backing3,
		&dftrace_entity_backing0, &dftrace_entity_backing1
	};
	return MEMORY_mem[*backing_addresses[index] + (index < 4u ? 1u : 3u)];
}

static void dftrace_pickup_frame_begin(DFTraceFrame *frame)
{
	unsigned index;
	unsigned row_address = MEMORY_mem[dftrace_playfield_row_lo] |
		((unsigned) MEMORY_mem[dftrace_playfield_row_hi] << 8);
	frame->pickup_prev_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_prev_y = MEMORY_mem[dftrace_entity_y + 1u];
	if (frame->pickup_prev_y >= DFTRACE_GAMEPLAY_TOP) {
		frame->pickup_prev_render_row =
			(frame->pickup_prev_y - DFTRACE_GAMEPLAY_TOP) >> 3;
		frame->pickup_prev_render_phase =
			(frame->pickup_prev_y - DFTRACE_GAMEPLAY_TOP) & 7u;
	}
	frame->pickup_vscroll = ANTIC_VSCROL;
	if (row_address >= DFTRACE_RING_SCREEN && row_address < DFTRACE_RING_END)
		frame->pickup_a2_head = (row_address - DFTRACE_RING_SCREEN) / 40u;
	dftrace_pickup_addresses(frame->pickup_old_address);
	for (index = 0; index < 6u; ++index) {
		frame->pickup_old_backing[index] = dftrace_pickup_backing(index);
		if (dftrace_pickup_screen_address_valid(frame->pickup_old_address[index]))
			frame->pickup_old_before_erase[index] =
				MEMORY_mem[frame->pickup_old_address[index]];
	}
	frame->pickup_glyph_cells_before = dftrace_pickup_glyph_cells();
	frame->pickup_footprints_before = dftrace_pickup_footprints();
}

static void dftrace_pickup_after_erase(DFTraceFrame *frame)
{
	unsigned index;
	for (index = 0; index < 6u; ++index)
		if (dftrace_pickup_screen_address_valid(frame->pickup_old_address[index]))
			frame->pickup_old_after_erase[index] =
				MEMORY_mem[frame->pickup_old_address[index]];
}

static void dftrace_pickup_frame_end(DFTraceFrame *frame)
{
	unsigned index;
	unsigned y = MEMORY_mem[dftrace_entity_y + 1u];
	if (y >= DFTRACE_GAMEPLAY_TOP) {
		frame->pickup_render_row = (y - DFTRACE_GAMEPLAY_TOP) >> 3;
		frame->pickup_render_phase = (y - DFTRACE_GAMEPLAY_TOP) & 7u;
	}
	dftrace_pickup_addresses(frame->pickup_new_address);
	for (index = 0; index < 6u; ++index) {
		frame->pickup_new_backing[index] = dftrace_pickup_backing(index);
		if (dftrace_pickup_screen_address_valid(frame->pickup_new_address[index]))
			frame->pickup_new_after_draw[index] =
				MEMORY_mem[frame->pickup_new_address[index]];
	}
	frame->pickup_glyph_cells_after = dftrace_pickup_glyph_cells();
	frame->pickup_footprints_after = dftrace_pickup_footprints();
}

static void dftrace_pickup_watch(DFTraceFrame *frame, unsigned pc)
{
	unsigned index;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	if (frame->pickup_first_overwrite_pc != 0u ||
		MEMORY_mem[dftrace_entity_state + 1u] != 2u ||
		(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) != 15u)
		return;
	for (index = 0; index < 6u; ++index) {
		unsigned address = frame->pickup_old_address[index];
		if (dftrace_pickup_screen_address_valid(address) &&
			MEMORY_mem[address] != ((base + index) & 0xffu)) {
			frame->pickup_first_overwrite_pc = pc;
			frame->pickup_first_overwrite_address = address;
			frame->pickup_first_overwrite_value = MEMORY_mem[address];
			frame->pickup_first_overwrite_scanline = ANTIC_ypos;
			return;
		}
	}
}

static void dftrace_snapshot_rapid_projectile(DFTraceFrame *frame)
{
	unsigned slot;
	frame->rapid_projectile_slot = 0xffffffffu;
	for (slot = 0; slot < 10u; ++slot) {
		unsigned state = MEMORY_mem[dftrace_projectile_active + slot];
		if (state != 0u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u)
			frame->viper_projectiles++;
		if (state == 1u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u &&
			MEMORY_mem[dftrace_entity_state + 2u] == 3u) {
			unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
				(MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
			unsigned screen_code = MEMORY_mem[address];
			frame->rapid_projectiles++;
			/* Prefer the exact yellow Viper code ($0f), not merely any positive
			 * code: a later base/broadside glyph may occupy the same cell. */
			if (frame->rapid_projectile_slot == 0xffffffffu ||
				((frame->rapid_projectile_screen_code != 0x0fu ||
				  frame->rapid_projectile_address < 0x4050u ||
				  frame->rapid_projectile_address >= 0x43c0u) && screen_code == 0x0fu &&
				 address >= 0x4050u && address < 0x43c0u)) {
				frame->rapid_projectile_slot = slot;
				frame->rapid_projectile_address = address;
				frame->rapid_projectile_screen_code = screen_code;
				frame->rapid_projectile_backing =
					MEMORY_mem[dftrace_projectile_backing_top + slot];
			}
		}
	}
}

static void dftrace_set_input(unsigned stick, unsigned trigger)
{
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | (stick & 0x0fu);
	GTIA_TRIG[0] = (UBYTE) (trigger != 0);
}

static void dftrace_set_gameplay_input(unsigned frame)
{
	unsigned stick = 0x0f;
	unsigned trigger = frame <= dftrace_fire_delay ? 1 : 0;
	unsigned x = MEMORY_mem[dftrace_player_x];
	unsigned y = MEMORY_mem[dftrace_player_y];
	if (strcmp(dftrace_policy, "sweep") == 0 ||
		strcmp(dftrace_policy, "broadside-proof") == 0) {
		int target_right = ((frame / 72u) & 1u) == 0;
		stick = target_right ? (x < 154u ? 0x07u : 0x0fu) :
			(x > 94u ? 0x0bu : 0x0fu);
	}
	else if (strcmp(dftrace_policy, "evasive") == 0) {
		int target_right = ((frame / 48u) & 1u) == 0;
		stick = target_right ? (x < 150u ? 0x07u : 0x0fu) :
			(x > 98u ? 0x0bu : 0x0fu);
		if (frame % 128u < 48u && y > 142u)
			stick &= 0x0eu;
		else if (frame % 128u >= 80u && y < 184u)
			stick &= 0x0du;
	}
	else if (strcmp(dftrace_policy, "hunt") == 0) {
		/* Follow the live Raider's PMG origin using only ordinary joystick
		 * input. This remains a production gameplay replay: no guest state is
		 * seeded, and held FIRE enters the canonical burst controller. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target = MEMORY_mem[dftrace_entity_x + 1u];
			++dftrace_pickup_hunt_active_frames;
			/* Keep one release pickup alive long enough to capture sixteen
			 * consecutive full ANTIC passes, using only ordinary joystick input.
			 * Afterwards resume the normal collection replay. */
			if (dftrace_pickup_hunt_active_frames <= 20u)
				stick = x <= target ? 0x0bu : 0x07u;
			else {
				if (x + 3u < target)
					stick = 0x07u;
				else if (x > target + 3u)
					stick = 0x0bu;
				if (y > MEMORY_mem[dftrace_entity_y + 1u] + 4u)
					stick &= 0x0eu;
				else if (y + 4u < MEMORY_mem[dftrace_entity_y + 1u])
					stick &= 0x0du;
			}
		}
		else {
			dftrace_pickup_hunt_active_frames = 0u;
			if (MEMORY_mem[dftrace_enemy_active] != 0) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
			}
		}
	}
	else if (strcmp(dftrace_policy, "pickup-observe") == 0) {
		/* Earn the drop through normal play, then stay horizontally clear so
		 * one production capsule can traverse the complete visible playfield. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target = MEMORY_mem[dftrace_entity_x + 1u];
			trigger = 1u;
			if (target < 128u)
				stick = x < 164u ? 0x07u : 0x0fu;
			else
				stick = x > 84u ? 0x0bu : 0x0fu;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "pickup-overlap") == 0) {
		/* Earn one production drop. Keep the Viper's visible double-width PMG
		 * edge over the capsule while its narrower collision envelope remains
		 * one HPOS beyond contact for four fine phases, then align and collect
		 * through the ordinary joystick/collision path. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
			unsigned target_y = MEMORY_mem[dftrace_entity_y + 1u];
			unsigned target_x = pickup_x - 8u;
			if (target_y + 16u >= y)
				++dftrace_pickup_hunt_active_frames;
			if (dftrace_pickup_hunt_active_frames > 5u)
				target_x = pickup_x;
			if (x + 3u < target_x)
				stick = 0x07u;
			else if (x > target_x + 3u)
				stick = 0x0bu;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0u) {
			dftrace_pickup_hunt_active_frames = 0u;
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "pickup-contact") == 0) {
		/* Follow the complete production collision path into a nose-first
		 * collection. No guest state is seeded or held by this policy. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target_x = MEMORY_mem[dftrace_entity_x + 1u];
			unsigned target_y = MEMORY_mem[dftrace_entity_y + 1u];
			if (x + 3u < target_x)
				stick = 0x07u;
			else if (x > target_x + 3u)
				stick = 0x0bu;
			if (y > target_y + 4u)
				stick &= 0x0eu;
			else if (y + 4u < target_y)
				stick &= 0x0du;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0u) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "restart") == 0 &&
		dftrace_gameplay_generation == 1u) {
		/* The engine regression gate needs a same-process New Game, not another
		 * cold boot. Accelerate only that diagnostic setup after 160 release
		 * gameplay frames: PLAYER_LIVES follows PLAYER_LIFECYCLE, while
		 * BROAD_DEATH_TIMER is the fixed documented broadside-state byte at
		 * PLAYER_LIFECYCLE-$4b. Production update_player_death still performs the
		 * GAME OVER transition, and the normal frontend driver starts generation
		 * two. No release byte is patched. */
		if (!dftrace_restart_game_over_seeded && frame == 160u) {
			MEMORY_mem[dftrace_player_lifecycle + 1u] = 0u;
			MEMORY_mem[dftrace_player_lifecycle - 0x4bu] = 1u;
			MEMORY_mem[dftrace_player_lifecycle] = 1u;
			dftrace_restart_game_over_seeded = 1;
		}
	}
	dftrace_set_input(stick, trigger);
}

static void dftrace_prepare_broadside_proof(void)
{
	unsigned slot;
	if (strcmp(dftrace_policy, "broadside-proof") != 0 ||
		dftrace_broadside_proof_admitted || dftrace_count < 3712u)
		return;
	/* Re-enter the production capital lifecycle once, at the frozen capital
	 * phase boundary. This is an explicit coverage fixture; all subsequent
	 * construction, muzzle publication, admission and projectile work is guest
	 * code from the exact release artifact. */
	if (!dftrace_broadside_proof_sector_started) {
		MEMORY_mem[dftrace_sector_state] = 0u;
		MEMORY_mem[dftrace_corridor_phase] = 0u;
		MEMORY_mem[dftrace_broad_visible_scrolls] = 0u;
		MEMORY_mem[dftrace_capital_drain_rows] = 0u;
		MEMORY_mem[dftrace_broad_schedule_index] = 0u;
		MEMORY_mem[dftrace_broad_turret_fired] = 0u;
		MEMORY_mem[dftrace_broad_turret_fired + 1u] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_hi] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_hi + 1u] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_lo] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_lo + 1u] = 0u;
		dftrace_broadside_proof_sector_started = 1;
	}
	if (
		MEMORY_mem[dftrace_sector_state] >= 5u ||
		(MEMORY_mem[dftrace_muzzle_screen_hi] == 0u &&
		 MEMORY_mem[dftrace_muzzle_screen_hi + 1u] == 0u))
		return;
	for (slot = 0; slot < 3u; ++slot) {
		if (MEMORY_mem[dftrace_broad_state + slot] != 0u) {
			dftrace_broadside_proof_admitted = 1;
			return;
		}
	}
	/* Align only the production scheduler's due tick with an already-live,
	 * source-published muzzle. The released admission, allocation, warning,
	 * projectile, impact and release paths remain unmodified and measured. */
	MEMORY_mem[dftrace_broad_schedule_timer] = 1u;
}

static void dftrace_set_frontend_input(void)
{
	unsigned state = MEMORY_mem[dftrace_game_state];
	unsigned selection = MEMORY_mem[dftrace_frontend_selection];
	unsigned armed = MEMORY_mem[dftrace_frontend_input_armed];
	unsigned difficulty = MEMORY_mem[dftrace_difficulty_setting];
	unsigned stick = 0x0f;
	unsigned trigger = 1;
	if ((unsigned) Atari800_nframes < dftrace_frontend_delay) {
		dftrace_set_input(stick, trigger);
		return;
	}

	/* Use the production release/arm/dispatch gate and the real menu/options
	 * handlers. No gameplay state is seeded directly by the tracer. */
	if (armed != 0) {
		if (state == 1) {
			if (difficulty == dftrace_difficulty) {
				if (selection == 0)
					trigger = 0;
				else
					stick = 0x0e; /* UP */
			}
			else if (selection < 1)
				stick = 0x0d; /* DOWN to OPTIONS */
			else if (selection > 1)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 2) {
			if (difficulty != dftrace_difficulty) {
				if (selection < 2)
					stick = 0x0d;
				else if (selection > 2)
					stick = 0x0e;
				else
					stick = difficulty < dftrace_difficulty ? 0x07 : 0x0b;
			}
			else if (selection < 3)
				stick = 0x0d; /* BACK */
			else if (selection > 3)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 7)
			trigger = 0; /* GAME OVER -> production return to main menu */
	}
	dftrace_set_input(stick, trigger);
}

static unsigned dftrace_pickup_timer(void)
{
	return MEMORY_mem[dftrace_entity_timer + 2u] |
		((unsigned) MEMORY_mem[dftrace_entity_move_accumulator + 2u] << 8);
}

static unsigned dftrace_hash_bytes(unsigned address, unsigned length)
{
	unsigned index;
	unsigned value = 2166136261u;
	for (index = 0; index < length; ++index) {
		value ^= MEMORY_mem[(address + index) & 0xffffu];
		value *= 16777619u;
	}
	return value;
}

static void dftrace_snapshot_engine(DFTraceFrame *frame)
{
	unsigned address;
	unsigned index;
	unsigned row_address = MEMORY_mem[dftrace_playfield_row_lo] |
		((unsigned) MEMORY_mem[dftrace_playfield_row_hi] << 8);
	frame->engine_timer = MEMORY_mem[dftrace_engine_timer];
	frame->engine_phase = MEMORY_mem[dftrace_engine_phase];
	frame->corridor_phase = MEMORY_mem[dftrace_corridor_phase];
	frame->ring_flags = MEMORY_mem[dftrace_ring_flags];
	frame->engine_vscroll = ANTIC_VSCROL;
	if (row_address >= DFTRACE_RING_SCREEN && row_address < DFTRACE_RING_END)
		frame->engine_a2_head = (row_address - DFTRACE_RING_SCREEN) / 40u;
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		if (MEMORY_mem[address] == DFTRACE_ENGINE_ALLIED_CODE)
			++frame->engine_allied_cells;
		else if (MEMORY_mem[address] == DFTRACE_ENGINE_ENEMY_CODE)
			++frame->engine_enemy_cells;
	}
	frame->engine_charset_hash = dftrace_hash_bytes(
		DFTRACE_CHARSET + DFTRACE_ENGINE_ALLIED_GLYPH * 8u, 16u);
	frame->engine_displayed_dlist_lo = dftrace_displayed_dlist_lo;
	frame->engine_published_dlist_lo = dftrace_published_dlist_lo;
	frame->engine_active_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	frame->engine_next_dlist_lo = MEMORY_mem[dftrace_next_dlist_lo];
	frame->engine_row0_address = row_address;
	frame->engine_displayed_row0_address =
		MEMORY_mem[0x7f00u + dftrace_displayed_dlist_lo + 7u] |
		((unsigned) MEMORY_mem[0x7f00u + dftrace_displayed_dlist_lo + 8u] << 8);
	frame->engine_active_row0_address =
		MEMORY_mem[0x7f00u + frame->engine_active_dlist_lo + 7u] |
		((unsigned) MEMORY_mem[0x7f00u + frame->engine_active_dlist_lo + 8u] << 8);
	for (index = 0; index < 8u; ++index) {
		frame->engine_divider[index] = MEMORY_mem[0x4028u + index];
		frame->engine_recycled[index] = MEMORY_mem[0x4398u + index];
	}
}

static void dftrace_watch_engine_write(DFTraceFrame *frame)
{
	unsigned index;
	unsigned base = DFTRACE_CHARSET + DFTRACE_ENGINE_ALLIED_GLYPH * 8u;
	if (!dftrace_engine_previous_valid) {
		for (index = 0; index < 16u; ++index)
			dftrace_engine_previous[index] = MEMORY_mem[base + index];
		dftrace_engine_previous_valid = 1;
		return;
	}
	for (index = 0; index < 16u; ++index) {
		unsigned value = MEMORY_mem[base + index];
		if (value != dftrace_engine_previous[index]) {
			if (frame->engine_first_write_pc == 0u) {
				frame->engine_first_write_pc = dftrace_previous_pc;
				frame->engine_first_write_address = base + index;
				frame->engine_first_write_old = dftrace_engine_previous[index];
				frame->engine_first_write_new = value;
				frame->engine_first_write_scanline = ANTIC_ypos;
				frame->engine_first_write_cycle = ANTIC_XPOS;
			}
			dftrace_engine_previous[index] = value;
		}
	}
}

static void dftrace_watch_display_list_write(DFTraceFrame *frame)
{
	unsigned index;
	unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
	if (!dftrace_display_list_previous_valid) {
		for (index = 0; index < 75u; ++index)
			dftrace_display_list_previous[index] = MEMORY_mem[base + index];
		dftrace_display_list_previous_valid = 1;
		return;
	}
	for (index = 0; index < 75u; ++index) {
		unsigned value = MEMORY_mem[base + index];
		if (value != dftrace_display_list_previous[index]) {
			if (frame->engine_first_dlist_write_pc == 0u) {
				frame->engine_first_dlist_write_pc = dftrace_previous_pc;
				frame->engine_first_dlist_write_address = base + index;
				frame->engine_first_dlist_write_old =
					dftrace_display_list_previous[index];
				frame->engine_first_dlist_write_new = value;
				frame->engine_first_dlist_write_scanline = ANTIC_ypos;
				frame->engine_first_dlist_write_cycle = ANTIC_XPOS;
			}
			dftrace_display_list_previous[index] = value;
		}
	}
}

static void dftrace_watch_recycled_write(DFTraceFrame *frame)
{
	unsigned index;
	if (!dftrace_recycled_previous_valid) {
		for (index = 0; index < 40u; ++index)
			dftrace_recycled_previous[index] = MEMORY_mem[0x4398u + index];
		dftrace_recycled_previous_valid = 1;
		return;
	}
	for (index = 0; index < 40u; ++index) {
		unsigned value = MEMORY_mem[0x4398u + index];
		if (value != dftrace_recycled_previous[index]) {
			/* The recycled physical row is written by rotate_playfield_rows before
			 * the logical table changes. Ignore unrelated overlays: the diagnostic
			 * wants the first base-layer copy, which is the only write reached from
			 * the exported rotation store label. */
			if (frame->engine_first_recycled_write_pc == 0u &&
				dftrace_previous_pc >= dftrace_pc_rotate_start &&
				dftrace_previous_pc < dftrace_pc_rotate_end && index < 8u) {
				frame->engine_first_recycled_write_pc = dftrace_previous_pc;
				frame->engine_first_recycled_write_address = 0x4398u + index;
				frame->engine_first_recycled_write_old =
					dftrace_recycled_previous[index];
				frame->engine_first_recycled_write_new = value;
				frame->engine_first_recycled_write_scanline = ANTIC_ypos;
				frame->engine_first_recycled_write_cycle = ANTIC_XPOS;
			}
			dftrace_recycled_previous[index] = value;
		}
	}
}

/* The optional integrity replay presses the physical OPTION key through the
 * production latch while Spread Shot is active. Host-only observation records
 * the timer on both sides; no guest state is seeded or repaired. */
static void dftrace_drive_pause_test(void)
{
	unsigned host_frame;
	unsigned state;
	unsigned timer;
	if (!dftrace_pause_test_enabled || dftrace_pause_test_completed)
		return;
	host_frame = (unsigned) Atari800_nframes;
	state = MEMORY_mem[dftrace_game_state];
	timer = dftrace_pickup_timer();
	INPUT_key_consol = INPUT_CONSOL_NONE;
	if (dftrace_pause_stage == 0u && state == 6u &&
		MEMORY_mem[dftrace_entity_state + 2u] == 4u &&
		timer >= 100u && timer <= 450u) {
		dftrace_pause_timer_before = timer;
		dftrace_pause_engine_timer_before = MEMORY_mem[dftrace_engine_timer];
		dftrace_pause_engine_phase_before = MEMORY_mem[dftrace_engine_phase];
		dftrace_pause_press_host = host_frame;
		dftrace_pause_stage = 1u;
	}
	if (dftrace_pause_stage == 1u) {
		if (host_frame <= dftrace_pause_press_host + 1u)
			INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
		else
			dftrace_pause_stage = 2u;
	}
	if (dftrace_pause_stage == 2u && state == 8u) {
		if (dftrace_pause_enter_host == 0xffffffffu) {
			dftrace_pause_enter_host = host_frame;
			/* The trigger can occur after the gameplay OPTION poll, allowing one
			 * final legal active tick. Measure the freeze from actual PAUSED entry,
			 * not from the earlier host-side request. */
			dftrace_pause_timer_before = timer;
			dftrace_pause_engine_timer_before = MEMORY_mem[dftrace_engine_timer];
			dftrace_pause_engine_phase_before = MEMORY_mem[dftrace_engine_phase];
		}
		if (host_frame >= dftrace_pause_enter_host + 25u) {
			dftrace_pause_press_host = host_frame;
			dftrace_pause_stage = 3u;
		}
	}
	if (dftrace_pause_stage == 3u) {
		if (host_frame <= dftrace_pause_press_host + 1u)
			INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
		else
			dftrace_pause_stage = 4u;
	}
	if (dftrace_pause_stage == 4u && state == 6u) {
		dftrace_pause_timer_after = timer;
		dftrace_pause_engine_timer_after = MEMORY_mem[dftrace_engine_timer];
		dftrace_pause_engine_phase_after = MEMORY_mem[dftrace_engine_phase];
		dftrace_pause_host_frames = host_frame - dftrace_pause_enter_host;
		dftrace_pause_test_completed = 1u;
	}
}

static uint64_t dftrace_clock(void)
{
	return (uint64_t) ANTIC_CPU_CLOCK;
}

static void dftrace_snapshot(DFTraceFrame *frame)
{
	frame->dma_ctl = ANTIC_DMACTL;
	frame->nmi_en = ANTIC_NMIEN;
	frame->projectiles = dftrace_count_nonzero(dftrace_projectile_active, 19);
	frame->broadside = dftrace_count_nonzero(dftrace_broad_state, 3);
	frame->far_rendered = dftrace_count_far_rendered();
	frame->live_raider = MEMORY_mem[dftrace_enemy_active] == 1;
	frame->fighter_explosion = dftrace_count_nonzero(dftrace_fighter_explosion_timer, 2);
	frame->capital_explosion = dftrace_count_nonzero(dftrace_capital_explosion_timer, 2);
	frame->music_active = MEMORY_mem[dftrace_music_active] != 0;
	frame->fire_sfx = MEMORY_mem[dftrace_fire_timer] != 0;
	frame->hit_sfx = MEMORY_mem[dftrace_hit_timer] != 0;
	frame->capital_sfx = MEMORY_mem[dftrace_capital_sound_timer] != 0;
	frame->sound_enabled = MEMORY_mem[dftrace_sound_enabled] != 0;
	frame->player_lifecycle = MEMORY_mem[dftrace_player_lifecycle];
	frame->player_x = MEMORY_mem[dftrace_player_x];
	frame->player_y = MEMORY_mem[dftrace_player_y];
	frame->prior = GTIA_PRIOR;
	frame->sector_state = MEMORY_mem[dftrace_sector_state];
	frame->gameplay_frame = MEMORY_mem[dftrace_gameplay_frame];
	frame->difficulty = MEMORY_mem[dftrace_difficulty_setting];
	frame->active_muzzles = dftrace_count_nonzero(dftrace_muzzle_screen_hi, 2);
	frame->entity_active = MEMORY_mem[dftrace_entity_active_count];
	frame->entity_x = MEMORY_mem[dftrace_entity_x];
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
	frame->entity_vx = MEMORY_mem[dftrace_entity_vx];
	frame->entity_move_accumulator = MEMORY_mem[dftrace_entity_move_accumulator];
	frame->entity_vertical_accumulator = MEMORY_mem[dftrace_entity_vertical_accumulator];
	frame->entity_render_id = MEMORY_mem[dftrace_entity_render_id];
	frame->entity_active_mask = MEMORY_mem[dftrace_entity_active_mask];
	frame->pickup_booster_state = MEMORY_mem[dftrace_entity_state + 2u];
	frame->pickup_state = MEMORY_mem[dftrace_entity_state + 1u] != 0u ?
		MEMORY_mem[dftrace_entity_state + 1u] : frame->pickup_booster_state;
	frame->pickup_counter = MEMORY_mem[dftrace_entity_hp + 1u];
	frame->pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
	frame->pickup_timer_lo = MEMORY_mem[dftrace_entity_timer +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_timer_hi = MEMORY_mem[dftrace_entity_move_accumulator +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_animation = MEMORY_mem[dftrace_entity_owner +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_render_id = MEMORY_mem[dftrace_entity_render_id + 1u];
	frame->pickup_drawn_mask = MEMORY_mem[dftrace_entity_drawn_mask + 1u];
	frame->score_lo = MEMORY_mem[dftrace_score_lo];
	frame->score_hi = MEMORY_mem[dftrace_score_hi];
}

static void dftrace_snapshot_flash(DFTraceFrame *frame)
{
	dftrace_snapshot_rapid_projectile(frame);
	frame->colbk = GTIA_COLBK;
	frame->colpm0 = GTIA_COLPM0;
	frame->colpm1 = GTIA_COLPM1;
	frame->colpm2 = GTIA_COLPM2;
	frame->colpm3 = GTIA_COLPM3;
	frame->colpf0 = GTIA_COLPF0;
	frame->colpf1 = GTIA_COLPF1;
	frame->colpf2 = GTIA_COLPF2;
	frame->colpf3 = GTIA_COLPF3;
	frame->viper_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer];
	frame->enemy_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer + 1u];
	frame->effect_active_mask = MEMORY_mem[dftrace_effect_active_mask];
	frame->effect_active_count = MEMORY_mem[dftrace_effect_active_count];
	frame->effect_rendered_mask = MEMORY_mem[dftrace_effect_rendered_mask];
	/* Pickup lifecycle is sampled after update/render so a qualifying kill,
	 * activation and collection belong to the frame that executed them. */
	frame->entity_active = MEMORY_mem[dftrace_entity_active_count];
	frame->entity_active_mask = MEMORY_mem[dftrace_entity_active_mask];
	frame->entity_x = MEMORY_mem[dftrace_entity_x];
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
	frame->entity_vx = MEMORY_mem[dftrace_entity_vx];
	frame->entity_move_accumulator = MEMORY_mem[dftrace_entity_move_accumulator];
	frame->entity_vertical_accumulator = MEMORY_mem[dftrace_entity_vertical_accumulator];
	frame->entity_render_id = MEMORY_mem[dftrace_entity_render_id];
	frame->pickup_booster_state = MEMORY_mem[dftrace_entity_state + 2u];
	frame->pickup_state = MEMORY_mem[dftrace_entity_state + 1u] != 0u ?
		MEMORY_mem[dftrace_entity_state + 1u] : frame->pickup_booster_state;
	frame->pickup_counter = MEMORY_mem[dftrace_entity_hp + 1u];
	frame->pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
	frame->pickup_timer_lo = MEMORY_mem[dftrace_entity_timer +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_timer_hi = MEMORY_mem[dftrace_entity_move_accumulator +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_animation = MEMORY_mem[dftrace_entity_owner +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_render_id = MEMORY_mem[dftrace_entity_render_id + 1u];
	frame->pickup_drawn_mask = MEMORY_mem[dftrace_entity_drawn_mask + 1u];
	frame->score_lo = MEMORY_mem[dftrace_score_lo];
	frame->score_hi = MEMORY_mem[dftrace_score_hi];
	frame->dli_sequence_violations = dftrace_dli_sequence_violations;
	frame->maximum_dlis_per_host_frame = dftrace_maximum_dlis_per_host_frame;
	frame->pause_test_completed = dftrace_pause_test_completed;
	frame->pause_timer_before = dftrace_pause_timer_before;
	frame->pause_timer_after = dftrace_pause_timer_after;
	frame->pause_engine_timer_before = dftrace_pause_engine_timer_before;
	frame->pause_engine_timer_after = dftrace_pause_engine_timer_after;
	frame->pause_engine_phase_before = dftrace_pause_engine_phase_before;
	frame->pause_engine_phase_after = dftrace_pause_engine_phase_after;
	frame->pause_host_frames = dftrace_pause_host_frames;
}

static void dftrace_write(void)
{
	FILE *file;
	unsigned index;
	file = fopen(dftrace_output, "w");
	if (file == NULL) {
		perror("darkfighter trace output");
		exit(2);
	}
	fprintf(file, "session,frame,start_clock,end_clock,next_start_clock,wall_cycles,start_host_frame,end_host_frame,next_start_host_frame,start_scanline,start_cycle,end_scanline,end_cycle,host_vbi_boundaries,extra_vbi_boundaries,missed_frames,dli_nmis,dma_ctl,nmi_en,projectiles,broadside,far_rendered,live_raider,fighter_explosion,capital_explosion,music_active,fire_sfx,hit_sfx,capital_sfx,sound_enabled,player_lifecycle,sector_state,gameplay_frame,difficulty,active_muzzles,entity_active,entity_x,entity_y,entity_vx,entity_move_accumulator,entity_vertical_accumulator,entity_render_id,colbk,colpm0,colpm1,colpm2,colpm3,colpf0,colpf1,colpf2,colpf3,viper_explosion_timer,enemy_explosion_timer,events,effect_active_mask,effect_active_count,effect_rendered_mask,entity_active_mask,pickup_state,pickup_counter,pickup_x,pickup_y,pickup_timer_lo,pickup_timer_hi,pickup_animation,pickup_render_id,pickup_drawn_mask,score_lo,score_hi,rapid_projectiles,rapid_projectile_slot,rapid_projectile_address,rapid_projectile_screen_code,rapid_projectile_backing,dli_sequence_violations,maximum_dlis_per_host_frame,pause_test_completed,pause_timer_before,pause_timer_after,pause_engine_timer_before,pause_engine_timer_after,pause_engine_phase_before,pause_engine_phase_after,pause_host_frames,viper_projectiles,pickup_booster_state,pickup_prev_x,pickup_prev_y,pickup_prev_render_row,pickup_prev_render_phase,pickup_render_row,pickup_render_phase,pickup_vscroll,pickup_a2_head,pickup_erase_calls,pickup_draw_calls,pickup_erase_scanline,pickup_erase_cycle,pickup_draw_scanline,pickup_draw_cycle,pickup_old_address0,pickup_old_address1,pickup_old_address2,pickup_old_address3,pickup_old_address4,pickup_old_address5,pickup_old_backing0,pickup_old_backing1,pickup_old_backing2,pickup_old_backing3,pickup_old_backing4,pickup_old_backing5,pickup_old_before_erase0,pickup_old_before_erase1,pickup_old_before_erase2,pickup_old_before_erase3,pickup_old_before_erase4,pickup_old_before_erase5,pickup_old_after_erase0,pickup_old_after_erase1,pickup_old_after_erase2,pickup_old_after_erase3,pickup_old_after_erase4,pickup_old_after_erase5,pickup_new_address0,pickup_new_address1,pickup_new_address2,pickup_new_address3,pickup_new_address4,pickup_new_address5,pickup_new_backing0,pickup_new_backing1,pickup_new_backing2,pickup_new_backing3,pickup_new_backing4,pickup_new_backing5,pickup_new_after_draw0,pickup_new_after_draw1,pickup_new_after_draw2,pickup_new_after_draw3,pickup_new_after_draw4,pickup_new_after_draw5,pickup_glyph_cells_before,pickup_glyph_cells_after,pickup_footprints_before,pickup_footprints_after,pickup_first_overwrite_pc,pickup_first_overwrite_address,pickup_first_overwrite_value,pickup_first_overwrite_scanline,engine_timer,engine_phase,corridor_phase,ring_flags,engine_vscroll,engine_a2_head,engine_allied_cells,engine_enemy_cells,engine_copy_calls,engine_copy_scanline,engine_copy_cycle,engine_first_write_pc,engine_first_write_address,engine_first_write_old,engine_first_write_new,engine_first_write_scanline,engine_first_write_cycle,engine_charset_hash,engine_displayed_dlist_lo,engine_published_dlist_lo,engine_active_dlist_lo,engine_next_dlist_lo,engine_row0_address,engine_displayed_row0_address,engine_active_row0_address,engine_divider0,engine_divider1,engine_divider2,engine_divider3,engine_divider4,engine_divider5,engine_divider6,engine_divider7,engine_recycled0,engine_recycled1,engine_recycled2,engine_recycled3,engine_recycled4,engine_recycled5,engine_recycled6,engine_recycled7,engine_first_dlist_write_pc,engine_first_dlist_write_address,engine_first_dlist_write_old,engine_first_dlist_write_new,engine_first_dlist_write_scanline,engine_first_dlist_write_cycle,engine_first_recycled_write_pc,engine_first_recycled_write_address,engine_first_recycled_write_old,engine_first_recycled_write_new,engine_first_recycled_write_scanline,engine_first_recycled_write_cycle,engine_playfield_select_calls,engine_playfield_select_scanline,engine_playfield_select_cycle,engine_playfield_select_dlist,engine_playfield_select_active_lo,gameplay_generation");
	for (index = 0; index < DFTRACE_PROFILE_COUNT; ++index)
		fprintf(file, ",profile_clock%u", index);
	for (index = 0; index < DFTRACE_PROFILE_DLI_COUNT; ++index)
		fprintf(file, ",profile_dli%u_start,profile_dli%u_end,profile_dli%u_segment",
			index, index, index);
	fprintf(file, ",profile_compose_calls,profile_compose_cycles"
		",profile_pointer_calls,profile_pointer_cycles"
		",profile_erase_viper_start,profile_raider_update_start"
		",profile_raider_render_start,profile_entity_erase_start"
		",profile_effect_update_end,profile_pickup_update_end"
		",profile_pickup_render_start,profile_effect_render_start"
		",player_x,player_y,prior,player_erase_calls,player_draw_calls"
		",player_erase_scanline,player_draw_scanline\n");
	for (index = 0; index < dftrace_count; ++index) {
		DFTraceFrame *frame = &dftrace_frames[index];
		uint64_t wall = frame->end_clock - frame->start_clock;
		unsigned host_boundaries = frame->end_host_frame - frame->start_host_frame;
		unsigned cadence_frames = frame->next_start_host_frame - frame->start_host_frame;
		unsigned extra_boundaries = host_boundaries > 1 ? host_boundaries - 1 : 0;
		unsigned missed_frames = cadence_frames > 1 ? cadence_frames - 1 : 0;
		fprintf(file,
			"%s,%u,%llu,%llu,%llu,%llu,%u,%u,%u,%d,%d,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			dftrace_session, index,
			(unsigned long long) frame->start_clock,
			(unsigned long long) frame->end_clock,
			(unsigned long long) frame->next_start_clock,
			(unsigned long long) wall,
			frame->start_host_frame, frame->end_host_frame, frame->next_start_host_frame,
			frame->start_y, frame->start_x, frame->end_y, frame->end_x,
			host_boundaries, extra_boundaries, missed_frames, frame->dli_nmis,
			frame->dma_ctl, frame->nmi_en, frame->projectiles, frame->broadside,
			frame->far_rendered, frame->live_raider, frame->fighter_explosion,
			frame->capital_explosion, frame->music_active, frame->fire_sfx,
			frame->hit_sfx, frame->capital_sfx, frame->sound_enabled,
			frame->player_lifecycle, frame->sector_state, frame->gameplay_frame,
			frame->difficulty, frame->active_muzzles, frame->entity_active,
			frame->entity_x, frame->entity_y, frame->entity_vx,
			frame->entity_move_accumulator, frame->entity_vertical_accumulator,
			frame->entity_render_id, frame->colbk, frame->colpm0, frame->colpm1,
			frame->colpm2, frame->colpm3, frame->colpf0, frame->colpf1,
			frame->colpf2, frame->colpf3, frame->viper_explosion_timer,
			frame->enemy_explosion_timer, frame->events, frame->effect_active_mask,
			frame->effect_active_count, frame->effect_rendered_mask,
			frame->entity_active_mask, frame->pickup_state, frame->pickup_counter,
			frame->pickup_x, frame->pickup_y, frame->pickup_timer_lo,
			frame->pickup_timer_hi, frame->pickup_animation, frame->pickup_render_id,
			frame->pickup_drawn_mask, frame->score_lo, frame->score_hi,
			frame->rapid_projectiles, frame->rapid_projectile_slot,
			frame->rapid_projectile_address, frame->rapid_projectile_screen_code,
			frame->rapid_projectile_backing, frame->dli_sequence_violations,
			frame->maximum_dlis_per_host_frame, frame->pause_test_completed,
			frame->pause_timer_before, frame->pause_timer_after,
			frame->pause_engine_timer_before, frame->pause_engine_timer_after,
			frame->pause_engine_phase_before, frame->pause_engine_phase_after,
			frame->pause_host_frames);
		fprintf(file, ",%u,%u", frame->viper_projectiles, frame->pickup_booster_state);
		fprintf(file,
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->pickup_prev_x, frame->pickup_prev_y,
			frame->pickup_prev_render_row, frame->pickup_prev_render_phase,
			frame->pickup_render_row, frame->pickup_render_phase,
			frame->pickup_vscroll, frame->pickup_a2_head,
			frame->pickup_erase_calls, frame->pickup_draw_calls,
			frame->pickup_erase_scanline, frame->pickup_erase_cycle,
			frame->pickup_draw_scanline, frame->pickup_draw_cycle,
			frame->pickup_old_address[0], frame->pickup_old_address[1],
			frame->pickup_old_address[2], frame->pickup_old_address[3],
			frame->pickup_old_address[4], frame->pickup_old_address[5],
			frame->pickup_old_backing[0], frame->pickup_old_backing[1],
			frame->pickup_old_backing[2], frame->pickup_old_backing[3],
			frame->pickup_old_backing[4], frame->pickup_old_backing[5],
			frame->pickup_old_before_erase[0], frame->pickup_old_before_erase[1],
			frame->pickup_old_before_erase[2], frame->pickup_old_before_erase[3],
			frame->pickup_old_before_erase[4], frame->pickup_old_before_erase[5],
			frame->pickup_old_after_erase[0], frame->pickup_old_after_erase[1],
			frame->pickup_old_after_erase[2], frame->pickup_old_after_erase[3],
			frame->pickup_old_after_erase[4], frame->pickup_old_after_erase[5],
			frame->pickup_new_address[0], frame->pickup_new_address[1],
			frame->pickup_new_address[2], frame->pickup_new_address[3],
			frame->pickup_new_address[4], frame->pickup_new_address[5],
			frame->pickup_new_backing[0], frame->pickup_new_backing[1],
			frame->pickup_new_backing[2], frame->pickup_new_backing[3],
			frame->pickup_new_backing[4], frame->pickup_new_backing[5],
			frame->pickup_new_after_draw[0], frame->pickup_new_after_draw[1],
			frame->pickup_new_after_draw[2], frame->pickup_new_after_draw[3],
			frame->pickup_new_after_draw[4], frame->pickup_new_after_draw[5],
			frame->pickup_glyph_cells_before, frame->pickup_glyph_cells_after,
			frame->pickup_footprints_before, frame->pickup_footprints_after,
			frame->pickup_first_overwrite_pc, frame->pickup_first_overwrite_address,
			frame->pickup_first_overwrite_value, frame->pickup_first_overwrite_scanline);
		fprintf(file,
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->engine_timer, frame->engine_phase, frame->corridor_phase,
			frame->ring_flags, frame->engine_vscroll, frame->engine_a2_head,
			frame->engine_allied_cells, frame->engine_enemy_cells,
			frame->engine_copy_calls, frame->engine_copy_scanline,
			frame->engine_copy_cycle, frame->engine_first_write_pc,
			frame->engine_first_write_address, frame->engine_first_write_old,
			frame->engine_first_write_new, frame->engine_first_write_scanline,
			frame->engine_first_write_cycle, frame->engine_charset_hash);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u",
			frame->engine_displayed_dlist_lo, frame->engine_published_dlist_lo,
			frame->engine_active_dlist_lo, frame->engine_next_dlist_lo,
			frame->engine_row0_address, frame->engine_displayed_row0_address,
			frame->engine_active_row0_address);
		for (unsigned cell = 0; cell < 8u; ++cell)
			fprintf(file, ",%u", frame->engine_divider[cell]);
		for (unsigned cell = 0; cell < 8u; ++cell)
			fprintf(file, ",%u", frame->engine_recycled[cell]);
		fprintf(file, ",%u,%u,%u,%u,%u,%u",
			frame->engine_first_dlist_write_pc,
			frame->engine_first_dlist_write_address,
			frame->engine_first_dlist_write_old,
			frame->engine_first_dlist_write_new,
			frame->engine_first_dlist_write_scanline,
			frame->engine_first_dlist_write_cycle);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->engine_first_recycled_write_pc,
			frame->engine_first_recycled_write_address,
			frame->engine_first_recycled_write_old,
			frame->engine_first_recycled_write_new,
			frame->engine_first_recycled_write_scanline,
			frame->engine_first_recycled_write_cycle,
			frame->engine_playfield_select_calls,
			frame->engine_playfield_select_scanline,
			frame->engine_playfield_select_cycle,
			frame->engine_playfield_select_dlist,
			frame->engine_playfield_select_active_lo,
			frame->gameplay_generation);
		for (unsigned profile = 0; profile < DFTRACE_PROFILE_COUNT; ++profile)
			fprintf(file, ",%llu", (unsigned long long) frame->profile_clock[profile]);
		for (unsigned dli = 0; dli < DFTRACE_PROFILE_DLI_COUNT; ++dli)
			fprintf(file, ",%llu,%llu,%u",
				(unsigned long long) frame->profile_dli_start[dli],
				(unsigned long long) frame->profile_dli_end[dli],
				frame->profile_dli_segment[dli]);
		fprintf(file, ",%u,%u,%u,%u,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu"
			",%u,%u,%u,%u,%u,%u,%u\n",
			frame->profile_compose_calls, frame->profile_compose_cycles,
			frame->profile_pointer_calls, frame->profile_pointer_cycles,
			(unsigned long long) frame->profile_erase_viper_start,
			(unsigned long long) frame->profile_raider_update_start,
			(unsigned long long) frame->profile_raider_render_start,
			(unsigned long long) frame->profile_entity_erase_start,
			(unsigned long long) frame->profile_effect_update_end,
			(unsigned long long) frame->profile_pickup_update_end,
			(unsigned long long) frame->profile_pickup_render_start,
			(unsigned long long) frame->profile_effect_render_start,
			frame->player_x, frame->player_y, frame->prior,
			frame->player_erase_calls, frame->player_draw_calls,
			frame->player_erase_scanline, frame->player_draw_scanline);
	}
	if (fclose(file) != 0) {
		perror("darkfighter trace close");
		exit(2);
	}
}

static void dftrace_init(void)
{
	const char *ram_fill = getenv("DFTRACE_RAM_FILL");
	if (ram_fill != NULL) {
		unsigned address;
		unsigned fill = dftrace_env_u("DFTRACE_RAM_FILL");
		if (fill > 0xffu) {
			fprintf(stderr, "darkfighter trace: RAM fill exceeds one byte\n");
			exit(2);
		}
		for (address = 0x8000u; address < 0xa000u; ++address)
			MEMORY_mem[address] = (UBYTE) fill;
	}
	dftrace_limit = dftrace_env_u("DFTRACE_FRAMES");
	dftrace_fire_delay = dftrace_env_u("DFTRACE_FIRE_DELAY");
	dftrace_difficulty = dftrace_env_u("DFTRACE_DIFFICULTY");
	dftrace_frontend_delay = getenv("DFTRACE_FRONTEND_DELAY") == NULL ? 0u :
		dftrace_env_u("DFTRACE_FRONTEND_DELAY");
	dftrace_engine_screenshot_generation =
		getenv("DFTRACE_ENGINE_SCREENSHOT_GENERATION") == NULL ? 1u :
		dftrace_env_u("DFTRACE_ENGINE_SCREENSHOT_GENERATION");
	if (dftrace_difficulty > 2) {
		fprintf(stderr, "darkfighter trace: invalid difficulty %u\n", dftrace_difficulty);
		exit(2);
	}
	dftrace_policy = getenv("DFTRACE_POLICY");
	dftrace_session = getenv("DFTRACE_SESSION");
	dftrace_output = getenv("DFTRACE_OUTPUT");
	if (dftrace_policy == NULL || dftrace_session == NULL || dftrace_output == NULL) {
		fprintf(stderr, "darkfighter trace: missing string environment\n");
		exit(2);
	}
	dftrace_frames = (DFTraceFrame *) calloc(dftrace_limit, sizeof(*dftrace_frames));
	if (dftrace_frames == NULL) {
		fprintf(stderr, "darkfighter trace: allocation failed\n");
		exit(2);
	}
#define DFTRACE_ADDRESS(field, env) field = dftrace_env_u(env)
	DFTRACE_ADDRESS(dftrace_pc_active, "DFTRACE_PC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_pc_end, "DFTRACE_PC_END");
	{
		unsigned profile_index;
		char profile_environment[32];
		for (profile_index = 0; profile_index < DFTRACE_PROFILE_COUNT; ++profile_index) {
			snprintf(profile_environment, sizeof(profile_environment),
				"DFTRACE_PC_PROFILE%u", profile_index);
			dftrace_pc_profile[profile_index] = dftrace_env_u(profile_environment);
		}
	}
	DFTRACE_ADDRESS(dftrace_pc_dli_end, "DFTRACE_PC_DLI_END");
	DFTRACE_ADDRESS(dftrace_pc_dli_hud_end, "DFTRACE_PC_DLI_HUD_END");
	DFTRACE_ADDRESS(dftrace_pc_compose_start, "DFTRACE_PC_COMPOSE_START");
	DFTRACE_ADDRESS(dftrace_pc_compose_end, "DFTRACE_PC_COMPOSE_END");
	DFTRACE_ADDRESS(dftrace_pc_pointer_start, "DFTRACE_PC_POINTER_START");
	DFTRACE_ADDRESS(dftrace_pc_pointer_end, "DFTRACE_PC_POINTER_END");
	DFTRACE_ADDRESS(dftrace_pc_erase_slot, "DFTRACE_PC_ERASE_SLOT");
	DFTRACE_ADDRESS(dftrace_pc_raider_update_start, "DFTRACE_PC_RAIDER_UPDATE_START");
	DFTRACE_ADDRESS(dftrace_pc_render_slot, "DFTRACE_PC_RENDER_SLOT");
	DFTRACE_ADDRESS(dftrace_pc_entity_erase_start, "DFTRACE_PC_ENTITY_ERASE_START");
	DFTRACE_ADDRESS(dftrace_pc_effect_update_end, "DFTRACE_PC_EFFECT_UPDATE_END");
	DFTRACE_ADDRESS(dftrace_pc_pickup_update_end, "DFTRACE_PC_PICKUP_UPDATE_END");
	DFTRACE_ADDRESS(dftrace_pc_frontend_poll, "DFTRACE_PC_FRONTEND_POLL");
	DFTRACE_ADDRESS(dftrace_pc_dli, "DFTRACE_PC_DLI");
	DFTRACE_ADDRESS(dftrace_pc_world, "DFTRACE_PC_WORLD");
	DFTRACE_ADDRESS(dftrace_pc_near, "DFTRACE_PC_NEAR");
	DFTRACE_ADDRESS(dftrace_pc_far_erase, "DFTRACE_PC_FAR_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_far_step, "DFTRACE_PC_FAR_STEP");
	DFTRACE_ADDRESS(dftrace_pc_hull, "DFTRACE_PC_HULL");
	DFTRACE_ADDRESS(dftrace_pc_broadside, "DFTRACE_PC_BROADSIDE");
	DFTRACE_ADDRESS(dftrace_pc_fighter_explosion, "DFTRACE_PC_FIGHTER_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_capital_explosion, "DFTRACE_PC_CAPITAL_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_music_tick, "DFTRACE_PC_MUSIC_TICK");
	DFTRACE_ADDRESS(dftrace_pc_entity_spawn, "DFTRACE_PC_ENTITY_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_contact, "DFTRACE_PC_ENTITY_CONTACT");
	DFTRACE_ADDRESS(dftrace_pc_entity_despawn, "DFTRACE_PC_ENTITY_DESPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_shot, "DFTRACE_PC_ENTITY_SHOT");
	DFTRACE_ADDRESS(dftrace_pc_effect_spawn, "DFTRACE_PC_EFFECT_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_effect_erase, "DFTRACE_PC_EFFECT_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_effect_update, "DFTRACE_PC_EFFECT_UPDATE");
	DFTRACE_ADDRESS(dftrace_pc_effect_render, "DFTRACE_PC_EFFECT_RENDER");
	DFTRACE_ADDRESS(dftrace_pc_raider_breakup_spawn, "DFTRACE_PC_RAIDER_BREAKUP_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_pickup_qualified_kill, "DFTRACE_PC_PICKUP_QUALIFIED_KILL");
	DFTRACE_ADDRESS(dftrace_pc_pickup_collect, "DFTRACE_PC_PICKUP_COLLECT");
	DFTRACE_ADDRESS(dftrace_pc_director_world, "DFTRACE_PC_DIRECTOR_WORLD");
	DFTRACE_ADDRESS(dftrace_pc_director_request, "DFTRACE_PC_DIRECTOR_REQUEST");
	DFTRACE_ADDRESS(dftrace_pc_director_event, "DFTRACE_PC_DIRECTOR_EVENT");
	DFTRACE_ADDRESS(dftrace_pc_entity_erase, "DFTRACE_PC_ENTITY_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_after_entity_erase, "DFTRACE_PC_AFTER_ENTITY_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_entity_draw, "DFTRACE_PC_ENTITY_DRAW");
	DFTRACE_ADDRESS(dftrace_pc_player_erase, "DFTRACE_PC_PLAYER_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_player_draw, "DFTRACE_PC_PLAYER_DRAW");
	DFTRACE_ADDRESS(dftrace_pc_engine_update, "DFTRACE_PC_ENGINE_UPDATE");
	DFTRACE_ADDRESS(dftrace_pc_engine_copy, "DFTRACE_PC_ENGINE_COPY");
	DFTRACE_ADDRESS(dftrace_pc_gameplay_init, "DFTRACE_PC_GAMEPLAY_INIT");
	DFTRACE_ADDRESS(dftrace_pc_rotate_start, "DFTRACE_PC_ROTATE_START");
	DFTRACE_ADDRESS(dftrace_pc_rotate_end, "DFTRACE_PC_ROTATE_END");
	dftrace_pc_dlist_publish = dftrace_pc_dli;
	DFTRACE_ADDRESS(dftrace_dli_phase, "DFTRACE_DLI_PHASE");
	DFTRACE_ADDRESS(dftrace_player_x, "DFTRACE_PLAYER_X");
	DFTRACE_ADDRESS(dftrace_player_y, "DFTRACE_PLAYER_Y");
	DFTRACE_ADDRESS(dftrace_projectile_active, "DFTRACE_PROJECTILE_ACTIVE");
	DFTRACE_ADDRESS(dftrace_projectile_rendered, "DFTRACE_PROJECTILE_RENDERED");
	DFTRACE_ADDRESS(dftrace_projectile_screen_lo, "DFTRACE_PROJECTILE_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_projectile_screen_hi, "DFTRACE_PROJECTILE_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_projectile_backing_top, "DFTRACE_PROJECTILE_BACKING_TOP");
	DFTRACE_ADDRESS(dftrace_broad_state, "DFTRACE_BROAD_STATE");
	DFTRACE_ADDRESS(dftrace_broad_schedule_timer, "DFTRACE_BROAD_SCHEDULE_TIMER");
	DFTRACE_ADDRESS(dftrace_broad_schedule_index, "DFTRACE_BROAD_SCHEDULE_INDEX");
	DFTRACE_ADDRESS(dftrace_broad_visible_scrolls, "DFTRACE_BROAD_VISIBLE_SCROLLS");
	DFTRACE_ADDRESS(dftrace_broad_turret_fired, "DFTRACE_BROAD_TURRET_FIRED");
	DFTRACE_ADDRESS(dftrace_corridor_phase, "DFTRACE_CORRIDOR_PHASE");
	DFTRACE_ADDRESS(dftrace_capital_drain_rows, "DFTRACE_CAPITAL_DRAIN_ROWS");
	DFTRACE_ADDRESS(dftrace_far_active, "DFTRACE_FAR_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_active, "DFTRACE_ENEMY_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_x, "DFTRACE_ENEMY_X");
	DFTRACE_ADDRESS(dftrace_fighter_explosion_timer, "DFTRACE_FIGHTER_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_explosion_timer, "DFTRACE_CAPITAL_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_music_active, "DFTRACE_MUSIC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_fire_timer, "DFTRACE_FIRE_TIMER");
	DFTRACE_ADDRESS(dftrace_hit_timer, "DFTRACE_HIT_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_sound_timer, "DFTRACE_CAPITAL_SOUND_TIMER");
	DFTRACE_ADDRESS(dftrace_sound_enabled, "DFTRACE_SOUND_ENABLED");
	DFTRACE_ADDRESS(dftrace_player_lifecycle, "DFTRACE_PLAYER_LIFECYCLE");
	DFTRACE_ADDRESS(dftrace_sector_state, "DFTRACE_SECTOR_STATE");
	DFTRACE_ADDRESS(dftrace_game_state, "DFTRACE_GAME_STATE");
	DFTRACE_ADDRESS(dftrace_frontend_selection, "DFTRACE_FRONTEND_SELECTION");
	DFTRACE_ADDRESS(dftrace_frontend_input_armed, "DFTRACE_FRONTEND_INPUT_ARMED");
	DFTRACE_ADDRESS(dftrace_difficulty_setting, "DFTRACE_DIFFICULTY_SETTING");
	DFTRACE_ADDRESS(dftrace_gameplay_frame, "DFTRACE_GAMEPLAY_FRAME");
	DFTRACE_ADDRESS(dftrace_muzzle_screen_hi, "DFTRACE_MUZZLE_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_muzzle_screen_lo, "DFTRACE_MUZZLE_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_entity_active_count, "DFTRACE_ENTITY_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_entity_x, "DFTRACE_ENTITY_X");
	DFTRACE_ADDRESS(dftrace_entity_y, "DFTRACE_ENTITY_Y");
	DFTRACE_ADDRESS(dftrace_entity_vx, "DFTRACE_ENTITY_VX");
	DFTRACE_ADDRESS(dftrace_entity_vy, "DFTRACE_ENTITY_VY");
	DFTRACE_ADDRESS(dftrace_entity_move_accumulator, "DFTRACE_ENTITY_MOVE_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_vertical_accumulator, "DFTRACE_ENTITY_VERTICAL_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_render_id, "DFTRACE_ENTITY_RENDER_ID");
	DFTRACE_ADDRESS(dftrace_entity_active_mask, "DFTRACE_ENTITY_ACTIVE_MASK");
	DFTRACE_ADDRESS(dftrace_entity_state, "DFTRACE_ENTITY_STATE");
	DFTRACE_ADDRESS(dftrace_entity_hp, "DFTRACE_ENTITY_HP");
	DFTRACE_ADDRESS(dftrace_entity_timer, "DFTRACE_ENTITY_TIMER");
	DFTRACE_ADDRESS(dftrace_entity_owner, "DFTRACE_ENTITY_OWNER");
	DFTRACE_ADDRESS(dftrace_entity_drawn_mask, "DFTRACE_ENTITY_DRAWN_MASK");
	DFTRACE_ADDRESS(dftrace_entity_screen_lo, "DFTRACE_ENTITY_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_entity_screen_hi, "DFTRACE_ENTITY_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_entity_backing0, "DFTRACE_ENTITY_BACKING0");
	DFTRACE_ADDRESS(dftrace_entity_backing1, "DFTRACE_ENTITY_BACKING1");
	DFTRACE_ADDRESS(dftrace_entity_backing2, "DFTRACE_ENTITY_BACKING2");
	DFTRACE_ADDRESS(dftrace_entity_backing3, "DFTRACE_ENTITY_BACKING3");
	DFTRACE_ADDRESS(dftrace_playfield_row_lo, "DFTRACE_PLAYFIELD_ROW_LO");
	DFTRACE_ADDRESS(dftrace_playfield_row_hi, "DFTRACE_PLAYFIELD_ROW_HI");
	DFTRACE_ADDRESS(dftrace_score_lo, "DFTRACE_SCORE_LO");
	DFTRACE_ADDRESS(dftrace_score_hi, "DFTRACE_SCORE_HI");
	DFTRACE_ADDRESS(dftrace_effect_active_mask, "DFTRACE_EFFECT_ACTIVE_MASK");
	DFTRACE_ADDRESS(dftrace_effect_active_count, "DFTRACE_EFFECT_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_effect_rendered_mask, "DFTRACE_EFFECT_RENDERED_MASK");
	DFTRACE_ADDRESS(dftrace_engine_timer, "DFTRACE_ENGINE_TIMER");
	DFTRACE_ADDRESS(dftrace_engine_phase, "DFTRACE_ENGINE_PHASE");
	DFTRACE_ADDRESS(dftrace_corridor_phase, "DFTRACE_CORRIDOR_PHASE");
	DFTRACE_ADDRESS(dftrace_ring_flags, "DFTRACE_RING_FLAGS");
	DFTRACE_ADDRESS(dftrace_active_dlist_lo, "DFTRACE_ACTIVE_DLIST_LO");
	DFTRACE_ADDRESS(dftrace_next_dlist_lo, "DFTRACE_NEXT_DLIST_LO");
#undef DFTRACE_ADDRESS
	dftrace_pickup_screenshot = getenv("DFTRACE_PICKUP_SCREENSHOT");
	dftrace_pickup_sequence_prefix = getenv("DFTRACE_PICKUP_SEQUENCE_PREFIX");
	dftrace_pickup_traversal_prefix = getenv("DFTRACE_PICKUP_TRAVERSAL_PREFIX");
	dftrace_pickup_contact_prefix = getenv("DFTRACE_PICKUP_CONTACT_PREFIX");
	dftrace_rapid_screenshot = getenv("DFTRACE_RAPID_SCREENSHOT");
	dftrace_spread_screenshot = getenv("DFTRACE_SPREAD_SCREENSHOT");
	dftrace_pause_test_enabled = getenv("DFTRACE_PAUSE_TEST") != NULL;
	dftrace_engine_screenshot_prefix = getenv("DFTRACE_ENGINE_SCREENSHOT_PREFIX");
	dftrace_initialised = 1;
}

static void DFTrace_Observe(unsigned pc, unsigned x_register)
{
	unsigned host_frame = (unsigned) Atari800_nframes;
	if (getenv("DFBOOT_OUTPUT") != NULL) {
		dfboot_observe(pc);
		return;
	}
	if (!dftrace_initialised)
		dftrace_init();
	if (dftrace_published_dlist_lo == 0u && MEMORY_mem[dftrace_game_state] == 6u)
		dftrace_published_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	if (host_frame != dftrace_display_host_frame) {
		dftrace_display_host_frame = host_frame;
		dftrace_displayed_dlist_lo = dftrace_published_dlist_lo;
	}
	if (pc == dftrace_pc_dlist_publish && MEMORY_mem[dftrace_dli_phase] == 0u)
		dftrace_published_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	if (pc == dftrace_pc_gameplay_init) {
		++dftrace_gameplay_generation;
		if (dftrace_gameplay_generation == dftrace_engine_screenshot_generation)
			dftrace_engine_screenshot_count = 0u;
	}
	dftrace_drive_pause_test();

	if (MEMORY_mem[dftrace_game_state] != 6u) {
		dftrace_active = 0;
		dftrace_dli_integrity_enabled = 0;
		dftrace_dli_integrity_complete_frame_seen = 0;
		dftrace_dli_integrity_host_frame = 0xffffffffu;
		dftrace_dli_integrity_count = 0u;
	}

	/* BOOT_STAGE2 deliberately overlays the later resident suffix, so its
	 * transient PC can alias frontend_input_poll before start has restored the
	 * runtime image. Drive only published frontend states; OPTIONS must remain
	 * reachable so non-default difficulties use the production input path. */
	if (!dftrace_active && pc == dftrace_pc_frontend_poll &&
		(MEMORY_mem[dftrace_game_state] == 1u ||
		 MEMORY_mem[dftrace_game_state] == 2u ||
		 MEMORY_mem[dftrace_game_state] == 7u)) {
		dftrace_set_frontend_input();
	}

	if (dftrace_dli_integrity_enabled && pc == dftrace_pc_dli) {
		unsigned host_frame = (unsigned) Atari800_nframes;
		unsigned phase = MEMORY_mem[dftrace_dli_phase];
		if (host_frame != dftrace_dli_integrity_host_frame) {
			if (dftrace_dli_integrity_complete_frame_seen &&
				dftrace_dli_integrity_count != 2u)
				++dftrace_dli_sequence_violations;
			dftrace_dli_integrity_host_frame = host_frame;
			dftrace_dli_integrity_count = 0u;
			dftrace_dli_integrity_complete_frame_seen = 1;
		}
		if (dftrace_dli_integrity_count >= 2u ||
			phase != dftrace_dli_integrity_count)
			++dftrace_dli_sequence_violations;
		++dftrace_dli_integrity_count;
		if (dftrace_dli_integrity_count > dftrace_maximum_dlis_per_host_frame)
			dftrace_maximum_dlis_per_host_frame = dftrace_dli_integrity_count;
	}

	if (pc == dftrace_pc_active && !dftrace_active) {
		if (!dftrace_dli_integrity_enabled) {
			dftrace_dli_integrity_enabled = 1;
			dftrace_dli_integrity_host_frame = (unsigned) Atari800_nframes;
			dftrace_dli_integrity_count = MEMORY_mem[dftrace_dli_phase] != 0u ? 1u : 0u;
			dftrace_maximum_dlis_per_host_frame = dftrace_dli_integrity_count;
		}
		if (dftrace_rapid_screenshot != NULL && *dftrace_rapid_screenshot != '\0' &&
			dftrace_rapid_screenshot_frame == 0xffffffffu &&
			MEMORY_mem[dftrace_entity_state + 2u] == 3u) {
			DFTraceFrame rapid;
			memset(&rapid, 0, sizeof(rapid));
			dftrace_snapshot_rapid_projectile(&rapid);
			if (rapid.rapid_projectiles >= 3u &&
				MEMORY_mem[dftrace_effect_active_count] == 0u &&
				(rapid.rapid_projectile_screen_code & 0x80u) == 0u &&
				rapid.rapid_projectile_screen_code >= 11u &&
				rapid.rapid_projectile_screen_code < 47u &&
				rapid.rapid_projectile_address >= 0x4050u &&
				rapid.rapid_projectile_address < 0x43c0u) {
				if (!Screen_SaveScreenshot(dftrace_rapid_screenshot, 0)) {
					fprintf(stderr, "darkfighter trace: Rapid Fire screenshot failed: %s\n",
						dftrace_rapid_screenshot);
					exit(2);
				}
				dftrace_rapid_screenshot_frame = dftrace_count;
			}
		}
		if (dftrace_spread_screenshot != NULL && *dftrace_spread_screenshot != '\0' &&
			dftrace_spread_screenshot_frame == 0xffffffffu &&
			MEMORY_mem[dftrace_entity_state + 2u] == 4u) {
			DFTraceFrame spread;
			memset(&spread, 0, sizeof(spread));
			dftrace_snapshot_rapid_projectile(&spread);
			if (spread.viper_projectiles >= 3u &&
				MEMORY_mem[dftrace_effect_active_count] == 0u) {
				if (!Screen_SaveScreenshot(dftrace_spread_screenshot, 0)) {
					fprintf(stderr, "darkfighter trace: Spread Shot screenshot failed: %s\n",
						dftrace_spread_screenshot);
					exit(2);
				}
				dftrace_spread_screenshot_frame = dftrace_count;
			}
		}
		/* Capture only after a complete ANTIC pass of the resident backed render
		 * and before this frame mutates lower layers. Screen_SaveScreenshot exports
		 * the existing framebuffer; the end-of-loop hook can run before the
		 * pickup's scanline and is therefore not visual evidence. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
			MEMORY_mem[dftrace_effect_active_count] == 0u) {
			dftrace_pickup_visible_passes++;
			if (dftrace_pickup_screenshot != NULL && *dftrace_pickup_screenshot != '\0' &&
				dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 2u &&
				!Screen_SaveScreenshot(dftrace_pickup_screenshot, 0)) {
				fprintf(stderr, "darkfighter trace: pickup screenshot failed: %s\n",
					dftrace_pickup_screenshot);
				exit(2);
			}
			if (dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 2u)
				dftrace_pickup_screenshot_frame = dftrace_count;
		}
		else
			dftrace_pickup_visible_passes = 0u;
		/* The first active hook still exposes the preceding framebuffer. Prime
		 * once, then capture 16 uninterrupted completed rasters regardless of
		 * unrelated effect activity elsewhere on screen. */
		if (dftrace_pickup_sequence_prefix != NULL &&
			*dftrace_pickup_sequence_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
			MEMORY_mem[dftrace_effect_active_count] == 0u &&
			dftrace_pickup_sequence_count < 16u) {
			if (dftrace_pickup_sequence_primed >= 2u) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_pickup_sequence_prefix, dftrace_pickup_sequence_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "darkfighter trace: pickup sequence screenshot failed: %s\n",
						path);
					exit(2);
				}
				++dftrace_pickup_sequence_count;
			}
			else
				++dftrace_pickup_sequence_primed;
		}
		else if (dftrace_pickup_sequence_prefix != NULL &&
			*dftrace_pickup_sequence_prefix != '\0' &&
			dftrace_pickup_sequence_count < 16u) {
			dftrace_pickup_sequence_count = 0u;
			dftrace_pickup_sequence_primed = 0u;
		}
		/* Traversal evidence follows the production slot even when an unrelated
		 * explosion effect overlaps the same frame. Glyph-cell accounting still
		 * proves that only one capsule footprint is resident. */
		if (dftrace_pickup_traversal_prefix != NULL &&
			*dftrace_pickup_traversal_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
			dftrace_pickup_traversal_count < 21u &&
			((MEMORY_mem[dftrace_entity_y + 1u] - DFTRACE_GAMEPLAY_TOP) & 7u) == 0u &&
			MEMORY_mem[dftrace_entity_y + 1u] != dftrace_pickup_traversal_last_y) {
			char path[1024];
			snprintf(path, sizeof(path), "%s-%02u.png",
				dftrace_pickup_traversal_prefix, dftrace_pickup_traversal_count);
			if (!Screen_SaveScreenshot(path, 0)) {
				fprintf(stderr, "darkfighter trace: pickup traversal screenshot failed: %s\n",
					path);
				exit(2);
			}
			dftrace_pickup_traversal_last_y = MEMORY_mem[dftrace_entity_y + 1u];
			++dftrace_pickup_traversal_count;
		}
		if (dftrace_pickup_contact_prefix != NULL &&
			*dftrace_pickup_contact_prefix != '\0' &&
			dftrace_pickup_contact_count < 24u) {
			unsigned pickup_state = MEMORY_mem[dftrace_entity_state + 1u];
			unsigned player_y = MEMORY_mem[dftrace_player_y];
			unsigned pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
			unsigned player_x = MEMORY_mem[dftrace_player_x];
			unsigned pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
			int near_contact = pickup_state == 2u && player_y >= pickup_y &&
				player_y - pickup_y <= 40u &&
				player_x + 12u >= pickup_x && pickup_x + 12u >= player_x;
			if (near_contact || (dftrace_pickup_contact_count != 0u &&
				dftrace_pickup_contact_after_collect < 3u)) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_pickup_contact_prefix, dftrace_pickup_contact_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "darkfighter trace: pickup contact screenshot failed: %s\n",
						path);
					exit(2);
				}
				++dftrace_pickup_contact_count;
				if (pickup_state != 2u)
					++dftrace_pickup_contact_after_collect;
			}
		}
		if (dftrace_count != 0 &&
			dftrace_frames[dftrace_count - 1].next_start_clock == 0u) {
			DFTraceFrame *previous = &dftrace_frames[dftrace_count - 1];
			previous->next_start_clock = dftrace_clock();
			previous->next_start_host_frame = (unsigned) Atari800_nframes;
		}
		if (dftrace_count == dftrace_limit) {
			dftrace_write();
			fflush(NULL);
			exit(0);
		}
		if (MEMORY_mem[dftrace_difficulty_setting] != dftrace_difficulty) {
			fprintf(stderr, "darkfighter trace: production frontend selected difficulty %u, expected %u\n",
				MEMORY_mem[dftrace_difficulty_setting], dftrace_difficulty);
			exit(2);
		}
		memset(&dftrace_current, 0, sizeof(dftrace_current));
		dftrace_display_list_previous_valid = 0;
		dftrace_recycled_previous_valid = 0;
		dftrace_active = 1;
		dftrace_set_gameplay_input(dftrace_count);
		dftrace_prepare_broadside_proof();
		dftrace_current.start_clock = dftrace_clock();
		dftrace_current.start_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.start_y = ANTIC_ypos;
		dftrace_current.start_x = ANTIC_XPOS;
		dftrace_snapshot(&dftrace_current);
		dftrace_snapshot_engine(&dftrace_current);
		dftrace_current.gameplay_generation = dftrace_gameplay_generation;
		if (dftrace_engine_screenshot_prefix != NULL &&
			*dftrace_engine_screenshot_prefix != '\0' &&
			dftrace_gameplay_generation == dftrace_engine_screenshot_generation &&
			dftrace_engine_screenshot_count < 150u) {
			char path[1024];
			snprintf(path, sizeof(path), "%s-%03u.png",
				dftrace_engine_screenshot_prefix, dftrace_engine_screenshot_count);
			if (!Screen_SaveScreenshot(path, 0)) {
				fprintf(stderr, "darkfighter trace: engine screenshot failed: %s\n", path);
				exit(2);
			}
			++dftrace_engine_screenshot_count;
		}
		dftrace_pickup_frame_begin(&dftrace_current);
		return;
	}

	if (!dftrace_active)
		goto observe_done;
	dftrace_watch_engine_write(&dftrace_current);
	dftrace_watch_display_list_write(&dftrace_current);
	dftrace_watch_recycled_write(&dftrace_current);
	dftrace_pickup_watch(&dftrace_current, pc);
	if (pc == dftrace_pc_player_erase) {
		++dftrace_current.player_erase_calls;
		dftrace_current.player_erase_scanline = ANTIC_ypos;
	}
	if (pc == dftrace_pc_player_draw) {
		++dftrace_current.player_draw_calls;
		dftrace_current.player_draw_scanline = ANTIC_ypos;
	}

	if (dftrace_current.profile_next < DFTRACE_PROFILE_COUNT &&
		pc == dftrace_pc_profile[dftrace_current.profile_next]) {
		dftrace_current.profile_clock[dftrace_current.profile_next] = dftrace_clock();
		/* Profile 18 is the projectile-render boundary immediately before the
		 * entity/effect renderer. Discard the earlier resident-capsule call so
		 * the nested render markers describe only the final layer pass. */
		if (dftrace_current.profile_next == 18u) {
			dftrace_current.profile_pickup_render_start = 0u;
			dftrace_current.profile_effect_render_start = 0u;
		}
		++dftrace_current.profile_next;
	}
	if (pc == dftrace_pc_compose_start) {
		dftrace_compose_start_clock = dftrace_clock();
		++dftrace_current.profile_compose_calls;
	}
	else if (pc == dftrace_pc_compose_end) {
		dftrace_current.profile_compose_cycles +=
			(unsigned) (dftrace_clock() + 6u - dftrace_compose_start_clock);
	}
	if (pc == dftrace_pc_pointer_start) {
		dftrace_pointer_start_clock = dftrace_clock();
		++dftrace_current.profile_pointer_calls;
	}
	else if (pc == dftrace_pc_pointer_end) {
		dftrace_current.profile_pointer_cycles +=
			(unsigned) (dftrace_clock() + 6u - dftrace_pointer_start_clock);
	}
	if (pc == dftrace_pc_erase_slot && x_register == 8u &&
		dftrace_current.profile_erase_viper_start == 0u)
		dftrace_current.profile_erase_viper_start = dftrace_clock();
	if (pc == dftrace_pc_raider_update_start)
		dftrace_current.profile_raider_update_start = dftrace_clock();
	if (pc == dftrace_pc_render_slot && x_register == 10u &&
		dftrace_current.profile_raider_render_start == 0u)
		dftrace_current.profile_raider_render_start = dftrace_clock();
	if (pc == dftrace_pc_entity_erase_start)
		dftrace_current.profile_entity_erase_start = dftrace_clock();
	if (pc == dftrace_pc_effect_update_end)
		dftrace_current.profile_effect_update_end = dftrace_clock();
	if (pc == dftrace_pc_pickup_update_end)
		dftrace_current.profile_pickup_update_end = dftrace_clock();
	if (pc == dftrace_pc_entity_draw &&
		dftrace_current.profile_pickup_render_start == 0u)
		dftrace_current.profile_pickup_render_start = dftrace_clock();
	if (pc == dftrace_pc_effect_render &&
		dftrace_current.profile_effect_render_start == 0u)
		dftrace_current.profile_effect_render_start = dftrace_clock();
	if (pc == dftrace_pc_dli) {
		++dftrace_current.dli_nmis;
		if (dftrace_current.profile_dli_count < DFTRACE_PROFILE_DLI_COUNT) {
			unsigned dli_index = dftrace_current.profile_dli_count;
			dftrace_current.profile_dli_start[dli_index] = dftrace_clock();
			dftrace_current.profile_dli_segment[dli_index] =
				dftrace_current.profile_next;
		}
	}
	else if ((pc == dftrace_pc_dli_end || pc == dftrace_pc_dli_hud_end) &&
		dftrace_current.profile_dli_count < DFTRACE_PROFILE_DLI_COUNT) {
		unsigned dli_index = dftrace_current.profile_dli_count;
		/* The hook runs before RTI. Include its fixed six NMOS 6502 cycles. */
		dftrace_current.profile_dli_end[dli_index] = dftrace_clock() + 6u;
		++dftrace_current.profile_dli_count;
	}
	if (dftrace_previous_pc != 0u && MEMORY_mem[dftrace_previous_pc] == 0x8du &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == 0x02u &&
		MEMORY_mem[(dftrace_previous_pc + 2u) & 0xffffu] == 0xd4u &&
		MEMORY_mem[dftrace_dli_phase] == 0u) {
		++dftrace_current.engine_playfield_select_calls;
		if (dftrace_current.engine_playfield_select_calls == 1u) {
			dftrace_current.engine_playfield_select_scanline = ANTIC_ypos;
			dftrace_current.engine_playfield_select_cycle = ANTIC_XPOS;
			dftrace_current.engine_playfield_select_dlist = ANTIC_dlist;
			dftrace_current.engine_playfield_select_active_lo =
				MEMORY_mem[dftrace_active_dlist_lo];
		}
	}
	if (pc == dftrace_pc_entity_erase) {
		++dftrace_current.pickup_erase_calls;
		if (dftrace_current.pickup_erase_calls == 1u) {
			dftrace_current.pickup_erase_scanline = ANTIC_ypos;
			dftrace_current.pickup_erase_cycle = ANTIC_XPOS;
		}
	}
	else if (pc == dftrace_pc_after_entity_erase)
		dftrace_pickup_after_erase(&dftrace_current);
	else if (pc == dftrace_pc_entity_draw) {
		++dftrace_current.pickup_draw_calls;
		if (dftrace_current.pickup_draw_calls == 1u) {
			dftrace_current.pickup_draw_scanline = ANTIC_ypos;
			dftrace_current.pickup_draw_cycle = ANTIC_XPOS;
		}
	}
	if (pc == dftrace_pc_engine_copy) {
		++dftrace_current.engine_copy_calls;
		if (dftrace_current.engine_copy_calls == 1u) {
			dftrace_current.engine_copy_scanline = ANTIC_ypos;
			dftrace_current.engine_copy_cycle = ANTIC_XPOS;
		}
	}
	if (pc == dftrace_pc_world)
		dftrace_current.events |= DFTRACE_EVENT_WORLD;
	else if (pc == dftrace_pc_near)
		dftrace_current.events |= DFTRACE_EVENT_NEAR_STEP;
	else if (pc == dftrace_pc_far_erase)
		dftrace_current.events |= DFTRACE_EVENT_FAR_ERASE;
	else if (pc == dftrace_pc_far_step)
		dftrace_current.events |= DFTRACE_EVENT_FAR_STEP;
	else if (pc == dftrace_pc_hull)
		dftrace_current.events |= DFTRACE_EVENT_HULL;
	else if (pc == dftrace_pc_broadside)
		dftrace_current.events |= DFTRACE_EVENT_BROADSIDE;
	else if (pc == dftrace_pc_fighter_explosion)
		dftrace_current.events |= DFTRACE_EVENT_FIGHTER_EXPLOSION;
	else if (pc == dftrace_pc_capital_explosion)
		dftrace_current.events |= DFTRACE_EVENT_CAPITAL_EXPLOSION;
	else if (pc == dftrace_pc_music_tick)
		dftrace_current.events |= DFTRACE_EVENT_MUSIC_TICK;
	else if (pc == dftrace_pc_entity_spawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SPAWN;
	else if (pc == dftrace_pc_entity_contact)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_CONTACT;
	else if (pc == dftrace_pc_entity_despawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_DESPAWN;
	else if (pc == dftrace_pc_entity_shot)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SHOT;
	else if (pc == dftrace_pc_effect_spawn)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_SPAWN;
	else if (pc == dftrace_pc_effect_erase)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_ERASE;
	else if (pc == dftrace_pc_effect_update)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_UPDATE;
	else if (pc == dftrace_pc_effect_render)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_RENDER;
	else if (pc == dftrace_pc_raider_breakup_spawn)
		dftrace_current.events |= DFTRACE_EVENT_RAIDER_BREAKUP_SPAWN;
	else if (pc == dftrace_pc_pickup_qualified_kill)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_QUALIFIED_KILL;
	else if (pc == dftrace_pc_pickup_collect)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_COLLECT;
	else if (pc == dftrace_pc_director_world)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_WORLD;
	else if (pc == dftrace_pc_director_request)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_REQUEST;
	else if (pc == dftrace_pc_director_event)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_EVENT;

	if (pc == dftrace_pc_end) {
		dftrace_snapshot_flash(&dftrace_current);
		dftrace_snapshot_engine(&dftrace_current);
		dftrace_pickup_frame_end(&dftrace_current);
		dftrace_current.end_clock = dftrace_clock();
		dftrace_current.end_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.end_y = ANTIC_ypos;
		dftrace_current.end_x = ANTIC_XPOS;
		dftrace_frames[dftrace_count++] = dftrace_current;
		dftrace_active = 0;
	}
observe_done:
	dftrace_previous_pc = pc;
}

#endif
