.setcpu "6502"

; Dark Fighter 0.1 vertical slice
; Target: stock Atari 65XE PAL, 64 KB

.export start
.export boot_return
.import __BROADSIDE_LOAD__, __BROADSIDE_RUN__
.import __STARFIELD_RUN__

.include "starfield.inc"

; -----------------------------------------------------------------------------
; OS workspace and vectors

DOSVEC      = $000A
APPMHI      = $0014
VDSLST      = $0200
MEMLO       = $02E7

; -----------------------------------------------------------------------------
; GTIA (write/read aliases share addresses)

HPOSP0      = $D000
HPOSP1      = $D001
HPOSP2      = $D002
HPOSP3      = $D003
HPOSM0      = $D004
HPOSM1      = $D005
HPOSM2      = $D006
HPOSM3      = $D007
SIZEP0      = $D008
SIZEP1      = $D009
SIZEP2      = $D00A
SIZEP3      = $D00B
SIZEM       = $D00C
M0PL        = $D008
M1PL        = $D009
M2PL        = $D00A
M3PL        = $D00B
P0PL        = $D00C
TRIG0       = $D010
COLPM0      = $D012
COLPM1      = $D013
COLPM2      = $D014
COLPM3      = $D015
COLPF0      = $D016
COLPF1      = $D017
COLPF2      = $D018
COLPF3      = $D019
COLBK       = $D01A
PRIOR       = $D01B
GRACTL      = $D01D
HITCLR      = $D01E

; -----------------------------------------------------------------------------
; POKEY

AUDF1       = $D200
AUDC1       = $D201
AUDF2       = $D202
AUDC2       = $D203
AUDF3       = $D204
AUDC3       = $D205
AUDF4       = $D206
AUDC4       = $D207
AUDCTL      = $D208

; -----------------------------------------------------------------------------
; PIA and ANTIC

STICK0      = $D300
DMACTL      = $D400
DLISTL      = $D402
DLISTH      = $D403
PMBASE      = $D407
CHBASE      = $D409
WSYNC       = $D40A
VCOUNT      = $D40B
NMIEN       = $D40E

; -----------------------------------------------------------------------------
; Reserved RAM

PMG_BASE    = $3800
STARFIELD_STAGING = $7410
MISSILES    = PMG_BASE + $0300
PLAYER0     = PMG_BASE + $0400
PLAYER1     = PMG_BASE + $0500
PLAYER2     = PMG_BASE + $0600
PLAYER3     = PMG_BASE + $0700
SCREEN      = $4000
CHARSET     = $4400
FRONTEND_CHARSET = $4800
HUD_CHARSET = $5000
CAPITAL_HULL_RUNTIME_ALLIED = $4C00
CAPITAL_HULL_RUNTIME_ENEMY  = $4D20
CAPITAL_HULL_RUNTIME_END    = $4E40
BROAD_STATE_BASE            = $4E40
BROAD_STATE                 = BROAD_STATE_BASE       ; 3 B
BROAD_OWNER                 = BROAD_STATE+$03        ; 3 B
BROAD_TURRET                = BROAD_OWNER+$03        ; 3 B
BROAD_X                     = BROAD_TURRET+$03       ; 3 B
BROAD_Y                     = BROAD_X+$03            ; 3 B
BROAD_TIMER                 = BROAD_Y+$03            ; 3 B
BROAD_PREV_Y                = BROAD_TIMER+$03        ; 3 B
BROAD_PREV_H                = BROAD_PREV_Y+$03       ; 3 B
BROAD_COLLISION             = BROAD_PREV_H+$03       ; 3 B
BROAD_SCHEDULE_TIMER        = BROAD_COLLISION+$03
BROAD_SCHEDULE_INDEX        = BROAD_SCHEDULE_TIMER+$01
BROAD_PLAYER_HEALTH         = BROAD_SCHEDULE_INDEX+$01
BROAD_DAMAGE_COOLDOWN       = BROAD_PLAYER_HEALTH+$01
BROAD_DEATH_TIMER           = BROAD_DAMAGE_COOLDOWN+$01
BROAD_ALLIED_HITS           = BROAD_DEATH_TIMER+$01
BROAD_ENEMY_HITS            = BROAD_ALLIED_HITS+$01
BROAD_WORK_SLOT             = BROAD_ENEMY_HITS+$01
BROAD_WORK_COUNT            = BROAD_WORK_SLOT+$01
BROAD_WORK_VALUE            = BROAD_WORK_COUNT+$01
BROAD_DAMAGE_APPLIED        = BROAD_WORK_VALUE+$01
BROAD_LAUNCH_USED           = BROAD_DAMAGE_APPLIED+$01
BROAD_M0_COLLISION          = BROAD_LAUNCH_USED+$01
BROAD_P0_COLLISION          = BROAD_M0_COLLISION+$01
BROAD_ROW_LO                = BROAD_P0_COLLISION+$01  ; 3 B
BROAD_ROW_HI                = BROAD_ROW_LO+$03        ; 3 B
BROAD_VISIBLE_SCROLLS       = BROAD_ROW_HI+$03
BROAD_STATE_END             = BROAD_VISIBLE_SCROLLS+$01
DIFFICULTY_SETTING          = BROAD_STATE_END        ; 1 B, persists across frontend states
FRONTEND_PERSISTENT_END     = DIFFICULTY_SETTING+$01
HULL_SCROLL_ACCUMULATOR     = FRONTEND_PERSISTENT_END
CORRIDOR_BOUNDARY_ROWS      = 23
CORRIDOR_BOUNDARY_LEFT      = HULL_SCROLL_ACCUMULATOR+$01 ; 23 B star backing
CORRIDOR_BOUNDARY_RIGHT     = CORRIDOR_BOUNDARY_LEFT+CORRIDOR_BOUNDARY_ROWS
BROAD_TURRET_FIRED          = CORRIDOR_BOUNDARY_RIGHT+CORRIDOR_BOUNDARY_ROWS
BROAD_FLASH_TIMER           = BROAD_TURRET_FIRED+CAPITAL_HULL_TURRET_COUNT ; 3 B
CAPITAL_SECTOR_STATE        = BROAD_FLASH_TIMER+$03
CAPITAL_SECTOR_DRAIN_ROWS   = CAPITAL_SECTOR_STATE+$01
PLAYER_CONTACT_ROWS         = CAPITAL_SECTOR_DRAIN_ROWS+$01
PLAYER_CONTACT_LEFT         = PLAYER_CONTACT_ROWS+$01
PLAYER_CONTACT_RIGHT        = PLAYER_CONTACT_LEFT+$01
PLAYER_LIFECYCLE            = PLAYER_CONTACT_RIGHT+$01
PLAYER_LIVES                = PLAYER_LIFECYCLE+$01
RESPAWN_INVULNERABLE_TIMER  = PLAYER_LIVES+$01
RESPAWN_BLINK_FRAME         = RESPAWN_INVULNERABLE_TIMER+$01
CAPITAL_EXPLOSION_TIMER     = RESPAWN_BLINK_FRAME+$01 ; 2 B, one per target hull
CAPITAL_EXPLOSION_ROW_LO    = CAPITAL_EXPLOSION_TIMER+$02 ; 2 B
CAPITAL_EXPLOSION_ROW_HI    = CAPITAL_EXPLOSION_ROW_LO+$02 ; 2 B
CAPITAL_EXPLOSION_COLUMN    = CAPITAL_EXPLOSION_ROW_HI+$02 ; 2 B
CAPITAL_EXPLOSION_BACKUP    = CAPITAL_EXPLOSION_COLUMN+$02 ; 2 * 3 * 3 B
CAPITAL_EXPLOSION_SOUND_TIMER = CAPITAL_EXPLOSION_BACKUP+$12
ENGINE_ANIMATION_TIMER      = CAPITAL_EXPLOSION_SOUND_TIMER+$01
ENGINE_ANIMATION_PHASE      = ENGINE_ANIMATION_TIMER+$01
ENEMY_ARCHETYPE             = ENGINE_ANIMATION_PHASE+$01
RAIDER_MOVE_ACCUMULATOR     = ENEMY_ARCHETYPE+$01
ENEMY_ACTIVE                = RAIDER_MOVE_ACCUMULATOR+$01
ENEMY_HP                    = ENEMY_ACTIVE+$01
ENEMY_PENDING_DAMAGE        = ENEMY_HP+$01
ENEMY_PENDING_SOURCE        = ENEMY_PENDING_DAMAGE+$01
GAMEPLAY_RESIDENT_END       = ENEMY_PENDING_SOURCE+$01

; Sparse far stars are decorative overlays above the authoritative
; near-layer screen cells.  Each record stores an exact screen address, so
; erase/redraw never has to recompute a column or retain a stale background
; byte.  Far stars are drawn only over CH_SPACE; erasing one therefore restores
; that same authoritative blank cell.  The four byte arrays live after the
; fixed fighter-projectile state and before the relocated starfield code.
STAR_FAR_ACTIVE              = $54CA
STAR_FAR_SCREEN_LO           = STAR_FAR_ACTIVE+STAR_FAR_CAPACITY
STAR_FAR_SCREEN_HI           = STAR_FAR_SCREEN_LO+STAR_FAR_CAPACITY
STAR_FAR_CODE                = STAR_FAR_SCREEN_HI+STAR_FAR_CAPACITY
STAR_FAR_STATE_END           = STAR_FAR_CODE+STAR_FAR_CAPACITY

STAR_RNG_STATE               = GAMEPLAY_RESIDENT_END
STAR_NEAR_PHASE              = STAR_RNG_STATE+$01
STAR_FAR_PHASE               = STAR_NEAR_PHASE+$01
STAR_TWINKLE_TIMER           = STAR_FAR_PHASE+$01
STAR_TWINKLE_SLOT            = STAR_TWINKLE_TIMER+$01
STAR_GENERATION_FLAGS        = STAR_TWINKLE_SLOT+$01
STARFIELD_STATE_END          = STAR_GENERATION_FLAGS+$01
TOP_SCORE_BCD_LO             = STARFIELD_STATE_END
TOP_SCORE_BCD_HI             = TOP_SCORE_BCD_LO+$01
SESSION_SCORE_STATE_END      = TOP_SCORE_BCD_HI+$01

.assert SESSION_SCORE_STATE_END <= $5000, error, "session score state exceeds reclaimed loader RAM"

.include "fighter-weapons.inc"

BROAD_FREE    = 0
BROAD_WARNING = 1
BROAD_FLYING  = 2
BROAD_IMPACT  = 3
BROAD_RAIDER_PULSE = 4
PLAYER_ALIVE                = 0
PLAYER_DYING                = 1
PLAYER_RESPAWN_INVULNERABLE = 2
PLAYER_GAME_OVER            = 3
OWNER_ALLIED  = 0
OWNER_ENEMY   = 1
OWNER_RAIDER  = 2
DAMAGE_PLAYER_PROJECTILE = 0
DAMAGE_PLAYER_CONTACT    = 1
DAMAGE_CAPITAL_CYLON     = 2
DAMAGE_CAPITAL_COLONIAL  = 3
DAMAGE_ENEMY_PROJECTILE  = 4
DAMAGE_CLEANUP           = 5
FIGHTER_PROJECTILE_FREE   = 0
FIGHTER_PROJECTILE_VIPER  = 1
FIGHTER_PROJECTILE_RAIDER = 2
DIFFICULTY_EASY   = 0
DIFFICULTY_MEDIUM = 1
DIFFICULTY_HARD   = 2
DIFFICULTY_DEFAULT = DIFFICULTY_MEDIUM

MISSILE_M0_MASK = $03
MISSILE_M0_CLEAR_MASK = $FC
BROADSIDE_DOUBLE_SIZES = $54
BROADSIDE_WARNING_Y_MAX = GAMEPLAY_BOTTOM-9
BROADSIDE_SCREEN_TOP = HUD_TOP
BROADSIDE_PLAYFIELD_TOP = GAMEPLAY_TOP
GAMEPLAY_FIRST_SCREEN_ROW = 1
GAMEPLAY_SCREEN = SCREEN+GAMEPLAY_FIRST_SCREEN_ROW*40
GAMEPLAY_SCREEN_END = SCREEN+24*40
BROADSIDE_SLOT_COUNT = 3
ENEMY_SLOT_COUNT = 1
ENEMY_SLOT_INDEX = 0
ENEMY_INACTIVE = 0
ENEMY_ACTIVE_STATE = 1
ENEMY_EXPLODING_STATE = 2
FIGHTER_EXPLOSION_VIPER_SLOT = 0
FIGHTER_EXPLOSION_ENEMY_SLOT = 1
PLAYER_HEALTH_UNITS = 10
CAPITAL_DAMAGE_UNITS = 2
ENEMY_PULSE_DAMAGE_UNITS = 1
ENEMY_VISIBLE_BOTTOM_EXCLUSIVE = GAMEPLAY_BOTTOM

PLAYER_H    = 16
PLAYER_COLLISION_WIDTH = 8
PLAYER_COLLISION_LAST_ROW = 14
PLAYER_X_MIN = 48
PLAYER_X_MAX = 200
PLAYER_Y_MIN = GAMEPLAY_TOP+16
PLAYER_Y_MAX = GAMEPLAY_BOTTOM-PLAYER_H

; Atari screen-code values for the OS character set.
CH_SPACE    = 0
CH_PANEL_SOLID = 1
CH_PANEL_EDGE = 2
CH_PANEL_RIVET = 3
CH_PANEL_TRUSS = 4
CH_PERCENT  = 5
CH_PANEL_FRAME = 6
CH_PANEL_STRIPE = 7
CH_SEPARATOR = 9
CH_STAR     = 10
CH_DASH     = 13
CH_DOT      = 14
CH_SLASH    = 15
CH_ZERO     = 16
CH_HUD_A    = 33
CH_COLON    = 26
CH_QUESTION = 31

STAR_GENERATE_NEAR = $01
STAR_GENERATE_FAR  = $02

KAWASAKI_GREEN = $D8
GAMEPLAY_COLPF0 = $0E
GAMEPLAY_COLPF1 = $84
GAMEPLAY_COLPF2 = VIPER_PROJECTILE_COLOR
GAMEPLAY_COLPF3 = RAIDER_PROJECTILE_COLOR
HUD_COLPF1 = $0E
HUD_COLPF2 = $00
HUD_LIFE_DIGIT_OFFSET = 18
HUD_HULL_HUNDREDS_OFFSET = 26
HUD_HULL_TENS_OFFSET = 27

.include "capital-hulls.inc"
.include "enemy-roster.inc"

.assert CORRIDOR_BOUNDARY_ROWS = CAPITAL_HULL_VISIBLE_ROWS, error, "boundary backing must cover every gameplay row"

; Existing high-energy hull glyphs form a compact two-phase capital slug.
; Playfield colour banks give the two capital factions independent colours
; without changing the player/enemy colours coupled to COLPM0-COLPM3.
CAPITAL_SHELL_PHASE0  = CAPITAL_HULL_GLYPH_BASE+18
CAPITAL_SHELL_PHASE1  = CAPITAL_HULL_GLYPH_BASE+19

.ifndef ENEMY_REVIEW_HARNESS
ENEMY_REVIEW_HARNESS = 0
.endif
.ifndef ENEMY_COMBAT_REVIEW_HARNESS
ENEMY_COMBAT_REVIEW_HARNESS = 0
.endif
.ifndef ENEMY_BODY_COLOR_OVERRIDE
ENEMY_RUNTIME_BODY_COLOR = ENEMY_BODY_COLOR
.else
ENEMY_RUNTIME_BODY_COLOR = ENEMY_BODY_COLOR_OVERRIDE
.endif

; ANTIC 6/7 use bits 6-7 as a direct COLPF0-COLPF3 colour bank.
ANTIC67_COLOR_PF0 = $00
ANTIC67_COLOR_PF1 = $40
ANTIC67_COLOR_PF2 = $80
ANTIC67_COLOR_PF3 = $C0
MAIN_MENU_HIGHLIGHT_XOR = ANTIC67_COLOR_PF3

; Frontend high-resolution glyph indices, all below the ANTIC 6/7 limit 64.
CH_FRONT_SPACE    = 0
CH_FRONT_ZERO     = 1
CH_FRONT_A        = 11
CH_FRONT_DASH     = 37
CH_FRONT_DOT      = 38
CH_FRONT_SLASH    = 39
CH_FRONT_COLON    = 40
CH_FRONT_QUESTION = 41
CH_FRONT_MARKER   = 42
FRONTEND_GLYPH_COUNT = 42
FRONTEND_GRAPHICS_BASE = 44
CH_FRONT_PANEL_SOLID = FRONTEND_GRAPHICS_BASE + CH_PANEL_SOLID
CH_FRONT_PANEL_EDGE = FRONTEND_GRAPHICS_BASE + CH_PANEL_EDGE
CH_FRONT_PANEL_FRAME = FRONTEND_GRAPHICS_BASE + CH_PANEL_FRAME
CH_FRONT_PANEL_TRUSS = FRONTEND_GRAPHICS_BASE + CH_PANEL_TRUSS
CH_FRONT_SEPARATOR = FRONTEND_GRAPHICS_BASE + CH_SEPARATOR
CH_FRONT_STAR = FRONTEND_GRAPHICS_BASE + CH_STAR
CH_FRONT_DOT_GRAPHIC = FRONTEND_GRAPHICS_BASE + CH_DOT

STATE_LOADER       = 0
STATE_MAIN_MENU    = 1
STATE_OPTIONS      = 2
STATE_TOP_SCORES   = 3
STATE_EXIT_CONFIRM = 4
STATE_EXITED       = 5
STATE_GAMEPLAY     = 6

FRONTEND_DEFAULT_SELECTION = 0

MAIN_MENU_DMA = $3A
MAIN_MENU_PLAYER_X = $48
MAIN_MENU_PLAYER_Y = $68
MAIN_MENU_PLAYER_SIZE = $03
MAIN_MENU_PLAYER_VERTICAL_SCALE = 2
MAIN_MENU_RED_LIGHT_X = $50
MAIN_MENU_RED_LIGHT_Y = $78
MAIN_MENU_RED_LIGHT_BITS = $81

; Mixed-mode screen bytes are sequential but row widths are not uniform.
; Mode 7 title: 20 B. Remaining rows: mode 6 uses 20 B; modes 2/4 use 40 B.
MAIN_MENU_TITLE_OFFSET = 0
MAIN_MENU_HANGAR_OUTER_TOP_OFFSET = 20
MAIN_MENU_HANGAR_MID_TOP_OFFSET = 60
MAIN_MENU_HANGAR_INNER_TOP_OFFSET = 100
MAIN_MENU_OPTION_0_OFFSET = 140
MAIN_MENU_HANGAR_BAY_TOP_OFFSET = 160
MAIN_MENU_OPTION_1_OFFSET = 200
MAIN_MENU_SCENE_7_OFFSET = 220
MAIN_MENU_OPTION_2_OFFSET = 260
MAIN_MENU_SCENE_9_OFFSET = 280
MAIN_MENU_OPTION_3_OFFSET = 320
MAIN_MENU_SCENE_11_OFFSET = 340
MAIN_MENU_SCENE_12_OFFSET = 380
MAIN_MENU_SCENE_13_OFFSET = 420
MAIN_MENU_SCENE_14_OFFSET = 460
MAIN_MENU_SCENE_15_OFFSET = 500
MAIN_MENU_HANGAR_BAY_BOTTOM_OFFSET = 540
MAIN_MENU_HANGAR_INNER_BOTTOM_OFFSET = 580
MAIN_MENU_HANGAR_MID_BOTTOM_OFFSET = 620
MAIN_MENU_HANGAR_OUTER_BOTTOM_OFFSET = 660
MAIN_MENU_DIVIDER_OFFSET = 700
MAIN_MENU_HINT_OFFSET = 740
MAIN_MENU_BOTTOM_OFFSET = 780
MAIN_MENU_SCREEN_BYTES = 820

MAIN_MENU_HANGAR_OUTER_LAST = 20
MAIN_MENU_HANGAR_MID_LAST = 16
MAIN_MENU_HANGAR_INNER_LAST = 12
MAIN_MENU_HANGAR_BAY_LAST = 8

MAIN_MENU_STAR_0 = MAIN_MENU_HANGAR_OUTER_TOP_OFFSET+28
MAIN_MENU_STAR_1 = MAIN_MENU_HANGAR_BAY_TOP_OFFSET+30
MAIN_MENU_STAR_2 = MAIN_MENU_SCENE_7_OFFSET+28
MAIN_MENU_STAR_3 = MAIN_MENU_SCENE_9_OFFSET+37
MAIN_MENU_STAR_4 = MAIN_MENU_SCENE_12_OFFSET+30
MAIN_MENU_STAR_5 = MAIN_MENU_SCENE_15_OFFSET+34
MAIN_MENU_STAR_6 = MAIN_MENU_HANGAR_OUTER_BOTTOM_OFFSET+26

CORRIDOR_ALLIED_COLUMNS = 8
CORRIDOR_CENTRAL_FIRST = 8
CORRIDOR_CENTRAL_END = 32
CORRIDOR_ENEMY_FIRST = 32
CORRIDOR_ENEMY_COLUMNS = 8
CORRIDOR_LEFT_HPOS = PLAYER_X_MIN + CORRIDOR_CENTRAL_FIRST*4
CORRIDOR_RIGHT_HPOS = PLAYER_X_MIN + CORRIDOR_CENTRAL_END*4
PLAYER_RESPAWN_X = CORRIDOR_LEFT_HPOS + (CORRIDOR_RIGHT_HPOS-CORRIDOR_LEFT_HPOS-PLAYER_COLLISION_WIDTH)/2
PLAYER_RESPAWN_Y = GAMEPLAY_BOTTOM-PLAYER_H
ENEMY_X_MIN = CORRIDOR_LEFT_HPOS
ENEMY_X_MAX = CORRIDOR_RIGHT_HPOS-ENEMY_RELEASE_VISIBLE_WIDTH
ENEMY_VISIBLE_WIDTH = ENEMY_RELEASE_VISIBLE_WIDTH
ENEMY_X_RANGE = ENEMY_X_MAX-ENEMY_X_MIN
ENEMY_SPAWN_X = ENEMY_X_MIN+ENEMY_X_RANGE/2

.assert BROAD_STATE_END <= $4E80, error, "broadside resident state exceeds 64 bytes"
.assert GAMEPLAY_RESIDENT_END <= $4F00, error, "gameplay resident state exceeds reclaimed RAM"
.assert STARFIELD_STATE_END <= $4F00, error, "starfield scalar state exceeds reclaimed RAM"
.assert STAR_FAR_STATE_END <= $555A, error, "far-star records overlap relocated starfield code"
.assert STAR_FAR_FIRST > CH_SPACE, error, "star codes must not alias blank space"
.assert STAR_NEAR_END <= VIPER_PROJECTILE_GLYPH_BASE, error, "star glyphs overlap Viper projectile glyphs"
.assert PLAYER_RESPAWN_X = 124, error, "player respawn must center the eight-HPOS envelope in the 24-column corridor"
.assert ENEMY_X_MIN = 80, error, "enemy left edge must begin at the central corridor"
.assert ENEMY_X_MAX = 160, error, "double-width enemy must end before the enemy hull"
.assert ENEMY_X_MAX+ENEMY_RELEASE_VISIBLE_WIDTH = CORRIDOR_RIGHT_HPOS, error, "enemy envelope must fit the corridor exactly"
.assert HUD_TOP = 8, error, "HUD must begin at the first active ANTIC scanline"
.assert HUD_BOTTOM = GAMEPLAY_TOP, error, "gameplay must begin immediately below the HUD"
.assert GAMEPLAY_BOTTOM-GAMEPLAY_TOP = CAPITAL_HULL_VISIBLE_ROWS*8, error, "gameplay viewport height changed"
.assert GAMEPLAY_SCREEN_ROWS = 23, error, "compact HUD must expose 23 gameplay rows"
.assert GAMEPLAY_SCREEN+GAMEPLAY_SCREEN_ROWS*40 = GAMEPLAY_SCREEN_END, error, "gameplay must retain the 960-byte screen end"
.assert PLAYER_RESPAWN_Y = 184, error, "respawn must retain its accepted hardware Y"
.assert VIPER_PROJECTILE_GLYPH_BASE+VIPER_PROJECTILE_GLYPH_COUNT <= CAPITAL_HULL_GLYPH_BASE, error, "Viper phase glyphs overlap capital hulls"
.assert RAIDER_PROJECTILE_GLYPH_BASE >= CAPITAL_HULL_GLYPH_BASE+CAPITAL_HULL_GLYPH_COUNT, error, "Raider phase glyphs overlap capital hulls"
.assert RAIDER_PROJECTILE_GLYPH_BASE+RAIDER_PROJECTILE_GLYPH_COUNT <= 128, error, "Raider phase glyphs exceed the charset"
.assert RESPAWN_INVULNERABLE_FRAMES = 250, error, "respawn invulnerability must be exactly five PAL seconds"
.assert RESPAWN_BLINK_HALF_PERIOD_FRAMES = 8, error, "respawn blink must toggle every eight PAL frames"
.assert BROADSIDE_WARNING_PULSE_FRAMES = 2, error, "warning pulse routine requires two-frame groups"
.assert CAPITAL_HULL_CONTACT_DAMAGE = BROADSIDE_PLAYER_DAMAGE, error, "contact damage must use shared 20-point path"
.assert CAPITAL_HULL_CONTACT_COOLDOWN = BROADSIDE_DAMAGE_COOLDOWN, error, "contact cooldown must use shared damage gate"
.assert BROADSIDE_PLAYER_DAMAGE = 20, error, "capital and hull contact damage must remain 20"
.assert ENEMY_SINGLE_PULSE_DAMAGE = 10, error, "Raider single-pulse damage must remain 10"
.assert CAPITAL_DAMAGE_UNITS*10 = BROADSIDE_PLAYER_DAMAGE, error, "capital damage scale changed"
.assert ENEMY_PULSE_DAMAGE_UNITS*10 = ENEMY_SINGLE_PULSE_DAMAGE, error, "pulse damage scale changed"
.assert ENEMY_PULSE_POOL_SLOTS = RAIDER_PROJECTILE_SLOT_COUNT, error, "Raider pool definitions diverged"
.assert ENEMY_PULSE_BURST_COUNT = RAIDER_BURST_COUNT, error, "Raider burst definitions diverged"
.assert ENEMY_PULSE_BURST_INTERVAL = RAIDER_BURST_INTERVAL, error, "Raider interval definitions diverged"
.assert ENEMY_PULSE_SPEED = RAIDER_PROJECTILE_SPEED, error, "Raider projectile speeds diverged"
.assert ENEMY_PULSE_COLOR = RAIDER_PROJECTILE_COLOR, error, "Raider playfield colours diverged"
.assert SHARED_FIGHTER_EXPLOSION_FRAME_COUNT = 6, error, "shared fighter explosion needs six phases"
.assert SHARED_FIGHTER_EXPLOSION_FRAME_DURATION = 4, error, "fighter explosion phase must last four PAL frames"
.assert SHARED_FIGHTER_EXPLOSION_TOTAL = 24, error, "fighter explosion must last exactly 24 PAL frames"
.assert RAIDER_HORIZONTAL_ACCELERATION = 1, error, "Raider acceleration hot path assumes one HPOS unit"
.assert RAIDER_MAX_HORIZONTAL_VELOCITY = 1, error, "Raider velocity state is bounded to -1/0/+1"
.assert VIPER_HORIZONTAL_STEP_HPOS = 2, error, "Viper lateral reference must remain two HPOS per PAL frame"
.assert RAIDER_HORIZONTAL_STEP_HPOS = VIPER_HORIZONTAL_STEP_HPOS, error, "fighter step units diverged"
.assert RAIDER_SPEED_NUMERATOR*8 = RAIDER_SPEED_DENOMINATOR*7, error, "Raider maximum speed must remain exactly 7/8 of Viper"
.assert RAIDER_SPEED_NUMERATOR < RAIDER_SPEED_DENOMINATOR, error, "Raider fractional rate must skip at least one frame"
.assert RAIDER_WEAVE_PERIOD_FRAMES = 32, error, "Raider weave hot path assumes a 32-frame period"
.assert RAIDER_ATTACK_ACTIVE_TOP = GAMEPLAY_TOP, error, "Raider pursuit begins at the gameplay viewport"
.assert RAIDER_ATTACK_ACTIVE_BOTTOM = GAMEPLAY_BOTTOM, error, "Raider pursuit ends at the gameplay viewport"

.segment "ZEROPAGE"

player_x:           .res 1
player_y:           .res 1
enemy_x:            .res 1
enemy_y:            .res 1
enemy_velocity_x:   .res 1
bullet_x:           .res 1
bullet_y:           .res 1
bullet_active:      .res 1
scanner_phase:      .res 1
frame_counter:      .res 1
scroll_accumulator: .res 1
fire_timer:         .res 1
hit_timer:          .res 1
damage_timer:       .res 1
rng_state:          .res 1
corridor_phase:     .res 1
score_bcd_lo:       .res 1
score_bcd_hi:       .res 1
row_counter:        .res 1
stick_value:        .res 1
loader_frame_count: .res 1
loader_dli_phase:   .res 1
loader_repeat_value:.res 1
src_ptr:            .res 2
dst_ptr:            .res 2
frontend_data_ptr:  .res 2
game_state:         .res 1
frontend_selection: .res 1
frontend_input_armed:.res 1
sound_enabled:      .res 1
gameplay_fire_gate: .res 1

; Loader, frontend and gameplay never run concurrently, so their DLI phase
; state safely reuses the same zero-page byte.
gameplay_dli_phase = loader_dli_phase

.segment "PROJECTILES"

FIGHTER_PROJECTILE_ACTIVE:        .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_X:             .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_Y:             .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_PREV_Y:        .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_LIFETIME:      .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_RENDERED:      .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_SCREEN_LO:     .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_SCREEN_HI:     .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_BACKUP_TOP:    .res FIGHTER_PROJECTILE_SLOT_COUNT
FIGHTER_PROJECTILE_BACKUP_BOTTOM: .res FIGHTER_PROJECTILE_SLOT_COUNT
VIPER_BURST_STATE:                .res 1
VIPER_BURST_REMAINING:            .res 1
VIPER_BURST_TIMER:                .res 1
RAIDER_BURST_STATE:               .res 1
RAIDER_BURST_REMAINING:           .res 1
RAIDER_BURST_TIMER:               .res 1
FIGHTER_EXPLOSION_TIMER:          .res SHARED_FIGHTER_EXPLOSION_SLOT_COUNT
FIGHTER_EXPLOSION_X:              .res SHARED_FIGHTER_EXPLOSION_SLOT_COUNT
FIGHTER_EXPLOSION_Y:              .res SHARED_FIGHTER_EXPLOSION_SLOT_COUNT
FIGHTER_PROJECTILE_STATE_END:

.assert FIGHTER_PROJECTILE_STATE_END-FIGHTER_PROJECTILE_ACTIVE = 202, error, "fighter projectile and explosion state budget changed"

.segment "CODE"

; The first six bytes are interpreted by the Atari OS disk boot routine.
; Byte 1 (sector count) is patched by scripts/build.mjs after linking.
boot_header:
    .byte $00
    .byte $00
    .word $2000
    .word boot_return

; The OS enters at BOOTAD+6 after loading the consecutive boot sectors.
boot_entry:
    lda #<$3B00
    sta MEMLO
    sta APPMHI
    lda #>$3B00
    sta MEMLO+1
    sta APPMHI+1

    lda #<start
    sta DOSVEC
    lda #>start
    sta DOSVEC+1

    clc
boot_return:
    rts

; XEX builds use RUNAD=start. Disk boot reaches start through DOSVEC.
start:
    sei

    lda #$00
    sta NMIEN
    sta DMACTL
    sta GRACTL
    sta AUDCTL

    ; The packed boot tail is expanded to reclaimed resident RAM before the
    ; loader starts using $4010-$5E0F for its bitmap.
    jsr unpack_broadside_runtime
    jsr stage_starfield_runtime

    sta game_state                 ; STATE_LOADER
    jsr unpack_loader_bitmap
    jsr show_loader
    jsr unpack_starfield_runtime

    ; Rebuild the gameplay and mixed-mode frontend displays with DMA off.
    ; This also reclaims loader-only payload bytes before Player 2 PMG data.
    jsr clear_pmg
    jsr copy_charset
    jsr copy_frontend_charset
    jsr copy_hud_charset
    jsr clear_screen

    ; Session TOP survives gameplay resets but not a full program restart.
    lda #$00
    sta TOP_SCORE_BCD_LO
    sta TOP_SCORE_BCD_HI

    lda #<display_list
    sta DLISTL
    lda #>display_list
    sta DLISTH

    lda #>PMG_BASE
    sta PMBASE
    lda #>CHARSET
    sta CHBASE

    lda #$01                    ; double-width ships at 160-color-clock scale
    sta SIZEP0
    sta SIZEP1
    sta SIZEP2
    sta SIZEP3
    lda #$00
    sta SIZEM
    sta PRIOR

    lda #$0E                    ; cold white player hull
    sta COLPM0
    lda #ENEMY_RUNTIME_BODY_COLOR ; reviewed medium steel-blue Cylon hull
    sta COLPM1
    lda #ENEMY_SCANNER_COLOR    ; hostile red scanner and M2 pulse
    sta COLPM2
    lda #$28                    ; amber engine plume
    sta COLPM3
    lda #$0E                    ; HUD and stars
    sta COLPF0
    lda #$84                    ; worn steel-blue structures
    sta COLPF1
    lda #$28                    ; amber telemetry
    sta COLPF2
    lda #KAWASAKI_GREEN        ; active main-menu label
    sta COLPF3
    lda #$00
    sta COLBK

    jsr silence_audio
    lda #$01
    sta sound_enabled           ; options default: SOUND ON
    lda #DIFFICULTY_DEFAULT
    sta DIFFICULTY_SETTING      ; options default: MEDIUM
.if ENEMY_REVIEW_HARNESS
    jmp start_gameplay          ; compile-time review artifact skips frontend input
.elseif ENEMY_COMBAT_REVIEW_HARNESS
    jmp start_gameplay          ; palette/combat review variants skip frontend input
.else
    jsr enter_main_menu
    jmp frontend_loop
.endif

unpack_broadside_runtime:
broadside_unpack_command:
    jsr broadside_read_source
    cmp #$00
    beq broadside_unpack_done
    tax
    bmi @match
@literal:
    jsr broadside_read_source
    jsr broadside_write_destination
    dex
    bne @literal
    jmp broadside_unpack_command
@match:
    sta row_counter
    and #$03
    sta loader_dli_phase
    jsr broadside_read_source
    clc
    adc #$01
    sta loader_repeat_value
    lda loader_dli_phase
    adc #$00
    sta loader_dli_phase
    lda broadside_destination+1
    sec
    sbc loader_repeat_value
    sta broadside_match_source+1
    lda broadside_destination+2
    sbc loader_dli_phase
    sta broadside_match_source+2
    lda row_counter
    and #$7C
    lsr
    lsr
    clc
    adc #$03
    tax
broadside_copy_match:
broadside_match_source:
    lda $FFFF
    jsr broadside_write_destination
    inc broadside_match_source+1
    bne :+
    inc broadside_match_source+2
:
    dex
    bne broadside_copy_match
    jmp broadside_unpack_command
broadside_unpack_done:
    rts

unpack_starfield_runtime:
    lda #<STARFIELD_STAGING
    sta broadside_read_source+1
    lda #>STARFIELD_STAGING
    sta broadside_read_source+2
    lda #<__STARFIELD_RUN__
    sta broadside_destination+1
    lda #>__STARFIELD_RUN__
    sta broadside_destination+2
    jmp broadside_unpack_command

; Patched by scripts/build.mjs. The packed starfield stream follows the packed
; BROADSIDE stream in the boot payload and is staged before loader bitmap use.
starfield_packed_source:
    .word $FFFF
starfield_packed_size:
    .word $FFFF

; Preserve the compact stream above the resident broadside reservation, clear
; of both the packed loader source and its bitmap destination. The buffer is
; transient and released after the loader.
stage_starfield_runtime:
    lda starfield_packed_source
    sta src_ptr
    lda starfield_packed_source+1
    sta src_ptr+1
    lda #<STARFIELD_STAGING
    sta dst_ptr
    lda #>STARFIELD_STAGING
    sta dst_ptr+1
    lda starfield_packed_size+1
    sta row_counter
    ldy #$00
    lda row_counter
    beq @tail_setup
@page:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    bne @page
    inc src_ptr+1
    inc dst_ptr+1
    dec row_counter
    bne @page
@tail_setup:
    lda starfield_packed_size
    beq @done
    tax
    ldy #$00
@tail:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    dex
    bne @tail
@done:
    rts

broadside_read_source:
@source:
    lda __BROADSIDE_LOAD__
    inc @source+1
    bne :+
    inc @source+2
:
    rts

broadside_write_destination:
broadside_destination:
    sta __BROADSIDE_RUN__
    inc broadside_destination+1
    bne :+
    inc broadside_destination+2
:
    rts

; -----------------------------------------------------------------------------
; Frontend state machine

frontend_loop:
    jsr wait_frame
    lda game_state
    cmp #STATE_MAIN_MENU
    bne :+
    jsr set_main_menu_palette      ; restore after the hint-row DLI
:
    lda STICK0
    and #$0F
    sta stick_value
    cmp #$0F
    bne @active_input
    lda TRIG0
    beq @active_input

    lda #$01
    sta frontend_input_armed
    jmp frontend_loop

@active_input:
    lda frontend_input_armed
    beq frontend_loop
    lda #$00
    sta frontend_input_armed
    jsr dispatch_frontend_input
    jmp frontend_loop

dispatch_frontend_input:
    lda game_state
    cmp #STATE_MAIN_MENU
    beq handle_main_menu_input
    cmp #STATE_OPTIONS
    beq handle_options_input
    cmp #STATE_TOP_SCORES
    beq handle_top_scores_input
    cmp #STATE_EXIT_CONFIRM
    beq handle_exit_input
    rts

handle_main_menu_input:
    ldx #$03
    lda stick_value
    and #$01
    bne :+
    jsr toggle_main_menu_highlight
    jmp move_selection_up
:
    lda stick_value
    and #$02
    bne :+
    jsr toggle_main_menu_highlight
    jmp move_selection_down
:
    lda TRIG0
    bne @done

    lda frontend_selection
    bne :+
    jmp start_gameplay
:
    cmp #$01
    beq @options
    cmp #$02
    beq @top_scores
    jmp enter_exit_confirmation
@done:
    rts
@options:
    jmp enter_options
@top_scores:
    jmp enter_top_scores

handle_options_input:
    jmp handle_options_input_resident

.segment "BROADSIDE"
handle_options_input_resident:
    ldx #$02
    lda stick_value
    and #$01
    bne :+
    jmp move_selection_up
:
    lda stick_value
    and #$02
    bne :+
    jmp move_selection_down
:
    lda frontend_selection
    beq @sound_row
    cmp #$01
    beq @difficulty_row
@back_row:
    lda TRIG0
    bne @done
    jmp enter_main_menu
@sound_row:
    lda stick_value
    and #$0C
    cmp #$0C
    beq :+
    jmp toggle_sound
:
    lda TRIG0
    bne :+
    jmp toggle_sound
:
    rts
@difficulty_row:
    lda stick_value
    and #$04
    beq select_previous_difficulty
    lda stick_value
    and #$08
    beq select_next_difficulty
@done:
    rts

.segment "CODE"

handle_top_scores_input:
    lda TRIG0
    bne @done
    jmp enter_main_menu
@done:
    rts

handle_exit_input:
    lda stick_value
    and #$05                    ; UP or LEFT selects NO
    cmp #$05
    bne @select_no
    lda stick_value
    and #$0A                    ; DOWN or RIGHT selects YES
    cmp #$0A
    bne @select_yes
    lda TRIG0
    bne @done
    lda frontend_selection
    beq @return_to_menu
    jmp enter_exited_state
@return_to_menu:
    jmp enter_main_menu
@done:
    rts
@select_no:
    lda #$00
    beq set_exit_selection
@select_yes:
    lda #$01
set_exit_selection:
    sta frontend_selection
    jsr update_frontend_marker
    rts

move_selection_up:
    lda frontend_selection
    bne :+
    stx frontend_selection
    jmp update_frontend_marker
:
    dec frontend_selection
    jmp update_frontend_marker

move_selection_down:
    lda frontend_selection
    cpx frontend_selection
    bne :+
    lda #$00
    sta frontend_selection
    jmp update_frontend_marker
:
    inc frontend_selection
    jmp update_frontend_marker

toggle_sound:
    lda sound_enabled
    eor #$01
    sta sound_enabled
    bne :+
    jsr silence_audio
:
    jmp draw_sound_value

.segment "BROADSIDE"
select_previous_difficulty:
    lda DIFFICULTY_SETTING
    bne :+
    lda #DIFFICULTY_HARD
    bne set_difficulty
:
    sec
    sbc #$01
    bcs set_difficulty

select_next_difficulty:
    lda DIFFICULTY_SETTING
    cmp #DIFFICULTY_HARD
    bne :+
    lda #DIFFICULTY_EASY
    beq set_difficulty
:
    clc
    adc #$01
set_difficulty:
    sta DIFFICULTY_SETTING
    jmp draw_difficulty_value

.segment "CODE"

enter_main_menu:
    lda #STATE_MAIN_MENU
    bne enter_frontend_state

enter_options:
    lda #STATE_OPTIONS
    bne enter_frontend_state

enter_top_scores:
    lda #STATE_TOP_SCORES
    bne enter_frontend_state

enter_exit_confirmation:
    lda #STATE_EXIT_CONFIRM

enter_frontend_state:
    sta game_state
    lda #FRONTEND_DEFAULT_SELECTION
    sta frontend_selection
    lda #$00
    sta frontend_input_armed
    sta DMACTL
    sta GRACTL
    sta NMIEN
    jsr select_frontend_display
    jsr render_frontend_state
    jsr wait_frame_start
    lda #$22                    ; normal playfield; sub-screens have no PMG
    ldx game_state
    cpx #STATE_MAIN_MENU
    bne :+
    lda #$02                    ; players only; no missile DMA or graphics
    sta GRACTL
    lda #$80                    ; one DLI switches the ANTIC 2 hint palette
    sta NMIEN
    lda #MAIN_MENU_DMA          ; mixed playfield plus single-line player DMA
:
    sta DMACTL
    rts

enter_exited_state:
    lda #STATE_EXITED
    sta game_state
    lda #$00
    sta DMACTL
    sta GRACTL
    sta NMIEN
    jsr silence_audio
    jsr select_frontend_display
    jsr render_frontend_state
    jsr wait_frame_start
    lda #$22
    sta DMACTL
@wait:
    jsr wait_frame
    jmp @wait

select_frontend_display:
    lda #>FRONTEND_CHARSET
    sta CHBASE
    lda game_state
    cmp #STATE_MAIN_MENU
    bne @text

    lda #<main_menu_display_list
    sta DLISTL
    lda #>main_menu_display_list
    sta DLISTH
    lda #<frontend_hint_dli
    sta VDSLST
    lda #>frontend_hint_dli
    sta VDSLST+1
    jmp set_main_menu_palette

@text:
    lda #<frontend_text_display_list
    sta DLISTL
    lda #>frontend_text_display_list
    sta DLISTH
    lda #$0E                    ; ANTIC 2 neutral-white luminance
    sta COLPF1
    lda #$00                    ; ANTIC 2 black hue/background
    sta COLPF2
    sta COLBK
    rts

set_main_menu_palette:
    lda #$0E                    ; ANTIC 6/7 bank 0: cold white
    sta COLPF0
    lda #$84                    ; ANTIC 4 worn steel-blue structures
    sta COLPF1
    lda #$28                    ; ANTIC 4 amber details
    sta COLPF2
    lda #KAWASAKI_GREEN        ; ANTIC 6/7 bank 3: active option
    sta COLPF3
    lda #$00
    sta COLBK
    rts

; The divider's DLI changes only the following ANTIC 2 hint row. The main
; frontend loop restores the scene palette after visible DMA on every frame.
frontend_hint_dli:
    pha
    lda #$00
    sta WSYNC
    lda #$0E
    sta COLPF1
    lda #$00
    sta COLPF2
    pla
    rti

render_frontend_state:
    lda game_state
    sec
    sbc #STATE_MAIN_MENU
    asl
    tax
    lda frontend_screen_data,x
    sta frontend_data_ptr
    lda frontend_screen_data+1,x
    sta frontend_data_ptr+1
    jsr render_frontend_data
    lda game_state
    cmp #STATE_MAIN_MENU
    bne :+
    jsr draw_main_menu_scene
    jmp update_frontend_marker
:
    cmp #STATE_OPTIONS
    bne :+
    jsr draw_sound_value
    jsr draw_difficulty_value
    jmp update_frontend_marker
:
    cmp #STATE_TOP_SCORES
    bne :+
    jmp draw_top_score_rows
:
    cmp #STATE_EXITED
    beq @done
    jmp update_frontend_marker
@done:
    rts

; Static launch-bay composition. All work happens once with DMA disabled.
draw_main_menu_scene:
    jsr draw_main_menu_hangar

    lda #CH_FRONT_PANEL_TRUSS
    ldx #MAIN_MENU_HANGAR_INNER_LAST
@inner:
    sta SCREEN+MAIN_MENU_HANGAR_INNER_TOP_OFFSET,x
    sta SCREEN+MAIN_MENU_HANGAR_INNER_BOTTOM_OFFSET,x
    dex
    bpl @inner

    lda #CH_FRONT_PANEL_EDGE
    ldx #MAIN_MENU_HANGAR_BAY_LAST
@bay:
    sta SCREEN+MAIN_MENU_HANGAR_BAY_TOP_OFFSET,x
    sta SCREEN+MAIN_MENU_HANGAR_BAY_BOTTOM_OFFSET,x
    dex
    bpl @bay

    lda #CH_FRONT_PANEL_FRAME
    sta SCREEN+MAIN_MENU_SCENE_11_OFFSET+5
    sta SCREEN+MAIN_MENU_SCENE_13_OFFSET+2
    sta SCREEN+MAIN_MENU_SCENE_15_OFFSET+2
    sta SCREEN+MAIN_MENU_HANGAR_BAY_BOTTOM_OFFSET+5

    lda #CH_FRONT_DOT_GRAPHIC
    sta SCREEN+MAIN_MENU_STAR_0
    sta SCREEN+MAIN_MENU_STAR_2
    sta SCREEN+MAIN_MENU_STAR_4
    sta SCREEN+MAIN_MENU_STAR_6
    lda #CH_FRONT_STAR
    sta SCREEN+MAIN_MENU_STAR_1
    sta SCREEN+MAIN_MENU_STAR_3
    sta SCREEN+MAIN_MENU_STAR_5

    lda #CH_FRONT_SEPARATOR
    ldx #39
@divider:
    sta SCREEN+MAIN_MENU_DIVIDER_OFFSET,x
    dex
    bpl @divider

    lda #MAIN_MENU_PLAYER_X
    sta HPOSP0
    sta HPOSP3
    lda #MAIN_MENU_PLAYER_SIZE
    sta SIZEP0
    sta SIZEP3
    lda #MAIN_MENU_RED_LIGHT_X
    sta HPOSP2
    lda #MAIN_MENU_RED_LIGHT_BITS
    sta PLAYER2+MAIN_MENU_RED_LIGHT_Y
    sta PLAYER2+MAIN_MENU_RED_LIGHT_Y+1

    ldy #MAIN_MENU_PLAYER_Y
    ldx #$00
@craft:
    lda player_shape,x
    sta PLAYER0,y
    sta PLAYER0+1,y
    lda player_engine_shape,x
    sta PLAYER3,y
    sta PLAYER3+1,y
    iny
    iny
    inx
    cpx #PLAYER_H
    bne @craft
    rts

draw_main_menu_hangar:
    lda #CH_FRONT_PANEL_SOLID
    ldx #MAIN_MENU_HANGAR_OUTER_LAST
@outer:
    sta SCREEN+MAIN_MENU_HANGAR_OUTER_TOP_OFFSET,x
    sta SCREEN+MAIN_MENU_HANGAR_OUTER_BOTTOM_OFFSET,x
    dex
    bpl @outer
    lda #CH_FRONT_PANEL_FRAME
    ldx #MAIN_MENU_HANGAR_MID_LAST
@middle:
    sta SCREEN+MAIN_MENU_HANGAR_MID_TOP_OFFSET,x
    sta SCREEN+MAIN_MENU_HANGAR_MID_BOTTOM_OFFSET,x
    dex
    bpl @middle
    rts

render_frontend_data:
    jsr clear_screen
@record:
    jsr read_frontend_data
    cmp #$FF
    beq @done
    sta dst_ptr
    jsr read_frontend_data
    sta dst_ptr+1
@text:
    jsr read_frontend_data
    cmp #$00
    beq @record
    jsr encode_frontend_character
    ldy #$00
    sta (dst_ptr),y
    inc dst_ptr
    bne @text
    inc dst_ptr+1
    jmp @text
@done:
    rts

; Maps the limited frontend ASCII contract to compact glyph indices 0-42.
encode_frontend_character:
    cmp #' '
    bne :+
    lda #CH_FRONT_SPACE
    rts
:
    cmp #'0'
    bcc @punctuation
    cmp #'9'+1
    bcs @letters
    sec
    sbc #'0'-CH_FRONT_ZERO
    rts
@letters:
    cmp #'A'
    bcc @punctuation
    cmp #'Z'+1
    bcs @punctuation
    sec
    sbc #'A'-CH_FRONT_A
    rts
@punctuation:
    cmp #'-'
    bne :+
    lda #CH_FRONT_DASH
    rts
:
    cmp #'.'
    bne :+
    lda #CH_FRONT_DOT
    rts
:
    cmp #'/'
    bne :+
    lda #CH_FRONT_SLASH
    rts
:
    cmp #':'
    bne :+
    lda #CH_FRONT_COLON
    rts
:
    lda #CH_FRONT_QUESTION
    rts

read_frontend_data:
    ldy #$00
    lda (frontend_data_ptr),y
    inc frontend_data_ptr
    bne :+
    inc frontend_data_ptr+1
:
    rts

update_frontend_marker:
    lda game_state
    ldx #$00
    ldy #$04
    cmp #STATE_MAIN_MENU
    beq @clear
    ldx #$04
    ldy #$03
    cmp #STATE_OPTIONS
    beq @clear
    ldx #$07
    cmp #STATE_EXIT_CONFIRM
    bne @done
@clear:
    stx loader_dli_phase
    sty loader_repeat_value
@clear_next:
    lda #CH_SPACE
    jsr draw_frontend_marker
    inx
    dec loader_repeat_value
    bne @clear_next
    lda frontend_selection
    clc
    adc loader_dli_phase
    tax
    lda #CH_FRONT_MARKER
    cpx #$04
    bcs :+
    ora #ANTIC67_COLOR_PF3
:
    jsr draw_frontend_marker
    cpx #$04
    bcs @done
    jmp toggle_main_menu_highlight
@done:
    rts

; A is the screen code and X is the absolute marker-position index.
draw_frontend_marker:
    sta row_counter
    txa
    asl
    tay
    lda frontend_marker_positions,y
    sta dst_ptr
    iny
    lda frontend_marker_positions,y
    sta dst_ptr+1
    ldy #$00
    lda row_counter
    sta (dst_ptr),y
    rts

; ANTIC 6/7 colour banks live in screen-code bits 6-7. EOR is reversible, so
; navigation restores the old row before highlighting the new one. The ten
; cells following each marker cover the longest label.
toggle_main_menu_highlight:
    ldy #11
@character:
    lda (dst_ptr),y
    beq @next
    eor #MAIN_MENU_HIGHLIGHT_XOR
    sta (dst_ptr),y
@next:
    dey
    cpy #1
    bne @character
    rts

draw_sound_value:
    lda sound_enabled
    beq @off
    lda #CH_FRONT_A+13          ; N
    sta SCREEN+10*40+22
    lda #CH_SPACE
    sta SCREEN+10*40+23
    rts
@off:
    lda #CH_FRONT_A+5           ; F
    sta SCREEN+10*40+22
    sta SCREEN+10*40+23
    rts

.segment "BROADSIDE"
draw_difficulty_value:
    lda DIFFICULTY_SETTING
    asl
    sta row_counter
    asl
    clc
    adc row_counter             ; six encoded bytes per difficulty name
    tax
    ldy #$00
@copy:
    lda difficulty_value_table,x
    sta SCREEN+13*40+23,y
    inx
    iny
    cpy #$06
    bne @copy
    rts

.segment "CODE"

draw_top_score_rows:
    lda #<(SCREEN+5*40+12)
    sta dst_ptr
    lda #>(SCREEN+5*40+12)
    sta dst_ptr+1
    ldx #$00
@row:
    ldy #14
@copy:
    lda top_score_row_template,y
    sta (dst_ptr),y
    dey
    bpl @copy

    lda #CH_FRONT_ZERO
    ldy #$00
    sta (dst_ptr),y
    iny
    cpx #$09
    beq @ten
    txa
    clc
    adc #CH_FRONT_ZERO+1
    sta (dst_ptr),y
    bne @next
@ten:
    lda #CH_FRONT_ZERO+1
    dey
    sta (dst_ptr),y
    iny
    lda #CH_FRONT_ZERO
    sta (dst_ptr),y
@next:
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    inx
    cpx #10
    bne @row
    jmp draw_session_top_score

; One reset path owns all gameplay state, hardware latches, PMG and audio.
start_gameplay:
    lda #STATE_GAMEPLAY
    sta game_state
    lda #$00
    sta DMACTL
    sta GRACTL
    sta NMIEN
    sta gameplay_fire_gate
    jsr silence_audio
    jsr clear_pmg
    jsr clear_screen
    jsr init_state
    jsr unpack_capital_hull_maps
    jsr init_broadside
    jsr init_screen
    jsr init_far_star_population
    lda player_x
    sta HPOSP0
    sta HPOSP3
    jsr draw_player
    jsr draw_enemy
    jsr update_score_display
    jsr update_hud_status
    sta HITCLR

    lda #<display_list
    sta DLISTL
    lda #>display_list
    sta DLISTH
    lda #<gameplay_dli
    sta VDSLST
    lda #>gameplay_dli
    sta VDSLST+1
    lda #$00
    sta gameplay_dli_phase
    lda #>HUD_CHARSET
    sta CHBASE

    lda #$01                   ; undo the menu-only wide PMG craft
    sta SIZEP0
    sta SIZEP3
    lda #HUD_COLPF1            ; neutral high-resolution HUD foreground
    sta COLPF1
    lda #HUD_COLPF2            ; black ANTIC 2 HUD background/hue
    sta COLPF2
    lda #GAMEPLAY_COLPF3       ; restore red structural accents for gameplay
    sta COLPF3
    lda #$00
    sta COLBK

    lda sound_enabled
    beq @display
    lda #$68                    ; quiet, continuous engine bed
    sta AUDF3
    lda #$22
    sta AUDC3
@display:
    jsr wait_frame_start
    lda #$80                    ; two bounded DLIs switch HUD/gameplay CHBASE
    sta NMIEN
    lda #$03                    ; enable players and missiles
    sta GRACTL
    lda #$3E                    ; normal playfield, single-line PMG DMA
    sta DMACTL

main_loop:
    jsr wait_frame
    inc frame_counter
    jsr erase_fighter_projectile_overlays
    jsr tick_shared_fighter_explosions
    jsr tick_capital_explosions
    jsr tick_launch_flashes
    jsr update_engine_animation

    jsr update_player_death
    bcc @lifecycle_ready
    jsr clear_pmg
    jsr silence_audio
    jsr enter_main_menu
    jmp frontend_loop
@lifecycle_ready:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @simulation
    jsr read_input
@simulation:
    jsr update_enemy
    lda #$00
    sta BROAD_DAMAGE_APPLIED
    jsr handle_collisions
    jsr update_viper_weapon
    jsr update_enemy_weapon
    jsr update_starfield
    jsr tick_star_twinkle
    jsr render_far_star_overlays_if_needed
    jsr handle_player_hull_contact
    jsr render_launch_flashes
    jsr render_capital_explosions
    jsr render_shared_fighter_explosions
    jsr render_capital_shell_overlays
    jsr render_fighter_projectile_overlays
    jsr update_sector_completion
    jsr update_sound
    jsr tick_respawn_invulnerability

    jmp main_loop

; -----------------------------------------------------------------------------
; Frame and initialization

wait_frame:
    lda #$70
@wait_for_line:
    cmp VCOUNT
    bne @wait_for_line
@leave_line:
    lda VCOUNT
    cmp #$70
    beq @leave_line
    rts

; Returns just after VCOUNT leaves zero, before the visible display begins.
wait_frame_start:
@wait_for_zero:
    lda VCOUNT
    bne @wait_for_zero
@leave_zero:
    lda VCOUNT
    beq @leave_zero
    rts

; The loader uses ANTIC F for lines 0-163 and ANTIC E for the studio footer.
; PMG remains disabled. Two DLIs switch colours at exact scanline boundaries.
show_loader:
    lda #<loader_display_list
    sta DLISTL
    lda #>loader_display_list
    sta DLISTH

    lda #$00                    ; normal CTIA/GTIA bitmap interpretation
    sta PRIOR
    jsr set_loader_title_palette

    lda #<loader_dli
    sta VDSLST
    lda #>loader_dli
    sta VDSLST+1
    lda #$00
    sta loader_dli_phase

    ; DMA starts before the first display-list line of a fresh PAL frame.
    jsr wait_frame_start
    lda #$80                    ; DLI only; OS VBI remains disabled
    sta NMIEN
    lda #$22                    ; normal playfield DMA, no PMG DMA
    sta DMACTL

    lda #LOADER_DURATION_FRAMES
    sta loader_frame_count
@frame:
    jsr wait_frame_start
    jsr set_loader_title_palette
    dec loader_frame_count
    bne @frame

    ; The 250th full frame has completed. Blank the next frame before rebuild.
    lda #$00
    sta NMIEN
    sta DMACTL
    rts

set_loader_title_palette:
    lda #LOADER_TITLE_COLPF1
    sta COLPF1
    lda #LOADER_TITLE_COLPF2
    sta COLPF2
    lda #LOADER_TITLE_COLBK
    sta COLBK
    rts

; WSYNC aligns each palette switch to the first color clock of the following
; zone. Including a worst-case WSYNC stall, each DLI is bounded by 160 cycles.
; Only A is used and preserved; X and Y are untouched.
loader_dli:
    pha
    lda #$00
    sta WSYNC
    lda loader_dli_phase
    bne @studio

    lda #LOADER_SHIP_COLPF1
    sta COLPF1
    lda #LOADER_SHIP_COLPF2
    sta COLPF2
    inc loader_dli_phase
    pla
    rti

@studio:
    lda #LOADER_STUDIO_COLPF1
    sta COLPF1
    lda #LOADER_STUDIO_COLPF2
    sta COLPF2
    lda #$00                    ; restore title phase for the next frame
    sta loader_dli_phase
    pla
    rti

; The accepted loader pixels use the same bounded LZ-10/5 decoder as the
; resident broadside block. Resetting both self-modified endpoints makes the
; second decode independent of the already-expanded gameplay runtime.
unpack_loader_bitmap:
    lda #<loader_bitmap_lzss
    sta broadside_read_source+1
    lda #>loader_bitmap_lzss
    sta broadside_read_source+2
    lda #<LOADER_BITMAP_ADDRESS
    sta broadside_destination+1
    lda #>LOADER_BITMAP_ADDRESS
    sta broadside_destination+2
    jmp broadside_unpack_command

init_state:
    lda #PLAYER_RESPAWN_X
    sta player_x
    lda #PLAYER_RESPAWN_Y
    sta player_y

    lda #ENEMY_SPAWN_X
    sta enemy_x
    lda #ENEMY_RELEASE_ARCHETYPE
    sta ENEMY_ARCHETYPE
    ldx #ENEMY_RELEASE_ARCHETYPE
    lda #(GAMEPLAY_TOP-ENEMY_RELEASE_FRAME_HEIGHT) ; progressive entry below HUD
    sta enemy_y
    lda #ENEMY_ACTIVE_STATE
    sta ENEMY_ACTIVE
    lda enemy_hit_points,x
    sta ENEMY_HP

    lda #$00
    sta enemy_velocity_x
    sta RAIDER_MOVE_ACCUMULATOR
    lda #$A7
    sta rng_state
    lda #STAR_GENERATION_SEED
    sta STAR_RNG_STATE

    lda #$00
    sta bullet_active
    sta scanner_phase
    sta frame_counter
    sta fire_timer
    sta hit_timer
    sta damage_timer
    sta score_bcd_lo
    sta score_bcd_hi
    sta ENEMY_PENDING_DAMAGE
    sta ENEMY_PENDING_SOURCE
    lda #$00                    ; finite flagship sector begins before its prows
    sta corridor_phase

    lda #$00
    sta scroll_accumulator
    sta HULL_SCROLL_ACCUMULATOR
    jsr init_fighter_projectiles
    jsr init_starfield_state
    jsr reset_enemy_fire_cooldown
    rts

clear_pmg:
    lda #$00
    ldx #$00
@loop:
    sta PMG_BASE+$000,x
    sta PMG_BASE+$100,x
    sta PMG_BASE+$200,x
    sta PMG_BASE+$300,x
    sta PMG_BASE+$400,x
    sta PMG_BASE+$500,x
    sta PMG_BASE+$600,x
    sta PMG_BASE+$700,x
    inx
    bne @loop
    rts

copy_charset:
    ldx #$00
@loop:
    lda charset_data+$000,x
    sta CHARSET+$000,x
    lda charset_data+$100,x
    sta CHARSET+$100,x
    lda charset_data+$200,x
    sta CHARSET+$200,x
    lda charset_data+$300,x
    sta CHARSET+$300,x
    inx
    bne @loop
    rts

; Expands the two packed 32x9 hull maps once after the loader has released
; $4C00-$4E3F. Runtime rows then use direct screen codes without per-row
; nibble decoding. Existing loader scratch variables are dead at this point.
unpack_capital_hull_maps:
    lda #<allied_hull_packed_map
    sta src_ptr
    lda #>allied_hull_packed_map
    sta src_ptr+1
    lda #<allied_hull_codebook
    sta frontend_data_ptr
    lda #>allied_hull_codebook
    sta frontend_data_ptr+1
    lda #<CAPITAL_HULL_RUNTIME_ALLIED
    sta dst_ptr
    lda #>CAPITAL_HULL_RUNTIME_ALLIED
    sta dst_ptr+1
    jsr unpack_capital_hull_map

    lda #<enemy_hull_packed_map
    sta src_ptr
    lda #>enemy_hull_packed_map
    sta src_ptr+1
    lda #<enemy_hull_codebook
    sta frontend_data_ptr
    lda #>enemy_hull_codebook
    sta frontend_data_ptr+1
    lda #<CAPITAL_HULL_RUNTIME_ENEMY
    sta dst_ptr
    lda #>CAPITAL_HULL_RUNTIME_ENEMY
    sta dst_ptr+1

unpack_capital_hull_map:
    lda #CAPITAL_HULL_SEGMENT_ROWS
    sta row_counter
@row:
    ldx #CAPITAL_HULL_PACKED_ROW_BYTES
@packed_byte:
    ldy #$00
    lda (src_ptr),y
    sta loader_repeat_value
    inc src_ptr
    bne :+
    inc src_ptr+1
:
    lsr
    lsr
    lsr
    lsr
    tay
    lda (frontend_data_ptr),y
    ldy #$00
    sta (dst_ptr),y
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
    cpx #$01                    ; fifth byte contains only column eight
    beq @next_byte
    lda loader_repeat_value
    and #$0F
    tay
    lda (frontend_data_ptr),y
    ldy #$00
    sta (dst_ptr),y
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
@next_byte:
    dex
    bne @packed_byte
    dec row_counter
    bne @row
    rts

; Builds the frontend-only 1-bit charset after the loader has released $4800.
; Glyph sources store seven visible rows; the pre-cleared eighth row preserves
; separation. ANTIC 4 structural glyphs are copied from the gameplay charset.
copy_frontend_charset:
    lda #$00
    ldx #$00
@clear:
    sta FRONTEND_CHARSET+$000,x
    sta FRONTEND_CHARSET+$100,x
    sta FRONTEND_CHARSET+$200,x
    sta FRONTEND_CHARSET+$300,x
    inx
    bne @clear

    lda #<frontend_glyph_rows
    sta src_ptr
    lda #>frontend_glyph_rows
    sta src_ptr+1
    lda #<(FRONTEND_CHARSET+CH_FRONT_ZERO*8)
    sta dst_ptr
    lda #>(FRONTEND_CHARSET+CH_FRONT_ZERO*8)
    sta dst_ptr+1
    ldx #FRONTEND_GLYPH_COUNT
@glyph:
    ldy #$00
@glyph_row:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #$07
    bne @glyph_row

    clc
    lda src_ptr
    adc #$07
    sta src_ptr
    bcc :+
    inc src_ptr+1
:
    clc
    lda dst_ptr
    adc #$08
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dex
    bne @glyph

    ldx #$00
@graphics:
    lda CHARSET,x
    sta FRONTEND_CHARSET+FRONTEND_GRAPHICS_BASE*8,x
    inx
    cpx #16*8
    bne @graphics
    rts

.segment "BROADSIDE"

; Builds a dedicated ANTIC 2 HUD charset at $5000 after the loader releases
; that RAM. Digits and letters use the compact 6x7 source shared with the
; frontend, but are expanded into Atari screen-code positions 16-25 and
; 33-58. The eighth scanline remains clear for legible row separation.
copy_hud_charset:
    lda #$00
    ldx #$00
@clear:
    sta HUD_CHARSET+$000,x
    sta HUD_CHARSET+$100,x
    sta HUD_CHARSET+$200,x
    sta HUD_CHARSET+$300,x
    inx
    bne @clear

    lda #<frontend_glyph_rows
    sta src_ptr
    lda #>frontend_glyph_rows
    sta src_ptr+1
    lda #<(HUD_CHARSET+CH_ZERO*8)
    sta dst_ptr
    lda #>(HUD_CHARSET+CH_ZERO*8)
    sta dst_ptr+1
    ldx #10
    jsr copy_hud_glyphs

    lda #<(HUD_CHARSET+CH_HUD_A*8)
    sta dst_ptr
    lda #>(HUD_CHARSET+CH_HUD_A*8)
    sta dst_ptr+1
    ldx #26
    jsr copy_hud_glyphs

    ; Percent is a dedicated native 6x7 glyph in otherwise unused character
    ; 12. Copying its canonical bytes keeps preview and ANTIC output aligned.
    ldx #$07
@percent:
    lda CHARSET+CH_PERCENT*8,x
    sta HUD_CHARSET+CH_PERCENT*8,x
    dex
    bpl @percent
    lda #$FF
    sta HUD_CHARSET+CH_SPACE*8+7

    rts

copy_hud_glyphs:
@glyph:
    ldy #$00
@row:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #$07
    bne @row
    lda #$FF                    ; shared bottom scanline forms the separator
    sta (dst_ptr),y
    clc
    lda src_ptr
    adc #$07
    sta src_ptr
    bcc :+
    inc src_ptr+1
:
    clc
    lda dst_ptr
    adc #$08
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dex
    bne @glyph
    rts

; Every used HUD glyph has a full-width white eighth scanline, so the compact
; HUD itself supplies the separator without a second character row. The HUD
; DLI waits through that line, then installs the ANTIC 4 charset/palette before
; the first gameplay scanline. The final-row DLI restores the HUD state.
; A is the only modified register and is preserved; X and Y remain untouched.
gameplay_dli:
    pha
    lda #$00
    sta WSYNC
    lda gameplay_dli_phase
    bne @hud

    lda #>CHARSET
    sta CHBASE
    lda #GAMEPLAY_COLPF0
    sta COLPF0
    lda #GAMEPLAY_COLPF1
    sta COLPF1
    lda #GAMEPLAY_COLPF2
    sta COLPF2
    lda #GAMEPLAY_COLPF3
    sta COLPF3
    inc gameplay_dli_phase
    pla
    rti

@hud:
    lda #>HUD_CHARSET
    sta CHBASE
    lda #HUD_COLPF1
    sta COLPF1
    lda #HUD_COLPF2
    sta COLPF2
    lda #$00
    sta gameplay_dli_phase
    pla
    rti

.segment "CODE"

clear_screen:
    lda #CH_SPACE
    ldx #$00
@loop:
    sta SCREEN+$000,x
    sta SCREEN+$100,x
    sta SCREEN+$200,x
    sta SCREEN+$300,x
    inx
    bne @loop
    rts

init_screen:
    ldx #$00
@title_loop:
    lda hud_ascii,x
    beq @title_done
    sec
    sbc #$20
    sta SCREEN,x
    inx
    bne @title_loop
@title_done:
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
    lda #GAMEPLAY_SCREEN_ROWS
    sta row_counter
    lda #$00
    sta BROAD_WORK_COUNT
@corridor_rows:
    jsr generate_starfield_row  ; initial near background uses its independent seed
    ldx BROAD_WORK_COUNT
    ldy #CORRIDOR_CENTRAL_FIRST
    lda (dst_ptr),y
    jsr store_boundary_star
    sta CORRIDOR_BOUNDARY_LEFT,x
    ldy #(CORRIDOR_CENTRAL_END-1)
    lda (dst_ptr),y
    jsr store_boundary_star
    sta CORRIDOR_BOUNDARY_RIGHT,x
    inc BROAD_WORK_COUNT
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @corridor_rows
    rts

; -----------------------------------------------------------------------------
; Player and input

read_input:
    jsr erase_player

    lda STICK0
    sta stick_value

    and #$04                    ; left, active low
    bne @not_left
    lda player_x
    cmp #PLAYER_X_MIN
    beq @not_left
    dec player_x
    dec player_x
@not_left:
    lda stick_value
    and #$08                    ; right
    bne @not_right
    lda player_x
    cmp #PLAYER_X_MAX
    beq @not_right
    inc player_x
    inc player_x
@not_right:
    lda stick_value
    and #$01                    ; up
    bne @not_up
    lda player_y
    cmp #PLAYER_Y_MIN
    beq @not_up
    dec player_y
@not_up:
    lda stick_value
    and #$02                    ; down
    bne @not_down
    lda player_y
    cmp #PLAYER_Y_MAX
    beq @not_down
    inc player_y
@not_down:
    lda player_x
    sta HPOSP0
    sta HPOSP3
    jsr draw_player_for_lifecycle

    lda gameplay_fire_gate
    bne @fire_ready
    lda TRIG0
    beq @done
    lda #$01
    sta gameplay_fire_gate
    rts
@fire_ready:
    ; The burst controller samples held FIRE after collision/movement updates.
    ; Released shots never inherit later Viper motion.
@done:
    rts

erase_player:
    ldy player_y
    ldx #PLAYER_H
    lda #$00
@loop:
    sta PLAYER0,y
    sta PLAYER3,y
    iny
    dex
    bne @loop
    rts

draw_player:
    ldy player_y
    ldx #$00
@loop:
    lda player_shape,x
    sta PLAYER0,y
    lda player_engine_shape,x
    sta PLAYER3,y
    iny
    inx
    cpx #PLAYER_H
    bne @loop
    rts

draw_player_for_lifecycle:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_RESPAWN_INVULNERABLE
    bne @visible
    lda RESPAWN_BLINK_FRAME
    and #RESPAWN_BLINK_HALF_PERIOD_FRAMES
    bne @hidden
@visible:
    jmp draw_player
@hidden:
    rts

; P0/P3 and P1/P2 each form one fighter-class render pair. The two fixed
; The adapters capture a stable PMG origin from each craft's established
; collision centre. The radial mask never samples a moving live coordinate.
begin_player_fighter_explosion:
    jsr erase_player
    lda player_x
    sec
    sbc #((SHARED_FIGHTER_EXPLOSION_WIDTH_BITS*2-PLAYER_COLLISION_WIDTH)/2)
    sta FIGHTER_EXPLOSION_X+FIGHTER_EXPLOSION_VIPER_SLOT
    lda player_y
    clc
    adc #((PLAYER_H-SHARED_FIGHTER_EXPLOSION_HEIGHT)/2)
    sta FIGHTER_EXPLOSION_Y+FIGHTER_EXPLOSION_VIPER_SLOT
    lda #SHARED_FIGHTER_EXPLOSION_TOTAL
    sta FIGHTER_EXPLOSION_TIMER+FIGHTER_EXPLOSION_VIPER_SLOT
    rts

tick_shared_fighter_explosions:
    ldx #(SHARED_FIGHTER_EXPLOSION_SLOT_COUNT-1)
@slot:
    lda FIGHTER_EXPLOSION_TIMER,x
    beq @next
    cmp #$01
    bne @tick
    jsr erase_shared_fighter_explosion_slot
@tick:
    dec FIGHTER_EXPLOSION_TIMER,x
@next:
    dex
    bpl @slot
    rts

fire_bullet = allocate_viper_projectile
update_bullet = update_fighter_projectiles

erase_bullet:
    jmp clear_viper_projectiles

; Nineteen fixed playfield slots provide independent launch positions without
; consuming M0 or the three capital-warning missiles. Shared precomputed phase
; glyphs avoid rewriting 16 charset bytes for every active shot every frame;
; each slot retains exact screen backing and a bounded swept-collision lifecycle.
init_fighter_projectiles:
    lda #$00
    ldx #(FIGHTER_PROJECTILE_SLOT_COUNT-1)
@state:
    sta FIGHTER_PROJECTILE_ACTIVE,x
    sta FIGHTER_PROJECTILE_X,x
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    sta FIGHTER_PROJECTILE_LIFETIME,x
    sta FIGHTER_PROJECTILE_RENDERED,x
    sta FIGHTER_PROJECTILE_SCREEN_LO,x
    sta FIGHTER_PROJECTILE_SCREEN_HI,x
    sta FIGHTER_PROJECTILE_BACKUP_TOP,x
    sta FIGHTER_PROJECTILE_BACKUP_BOTTOM,x
    dex
    bpl @state
    sta VIPER_BURST_STATE
    sta VIPER_BURST_REMAINING
    sta VIPER_BURST_TIMER
    sta RAIDER_BURST_STATE
    sta RAIDER_BURST_REMAINING
    sta RAIDER_BURST_TIMER
    sta bullet_active
    ldx #(SHARED_FIGHTER_EXPLOSION_SLOT_COUNT-1)
@explosion_state:
    sta FIGHTER_EXPLOSION_TIMER,x
    sta FIGHTER_EXPLOSION_X,x
    sta FIGHTER_EXPLOSION_Y,x
    dex
    bpl @explosion_state
    ldx #$00
@viper_glyph_page:
    lda viper_projectile_glyphs,x
    sta CHARSET+VIPER_PROJECTILE_GLYPH_BASE*8,x
    inx
    bne @viper_glyph_page
    ldx #$00
@viper_glyph_tail:
    lda viper_projectile_glyphs+$100,x
    sta CHARSET+VIPER_PROJECTILE_GLYPH_BASE*8+$100,x
    inx
    cpx #32
    bne @viper_glyph_tail
    jsr build_raider_projectile_glyphs
    jmp build_star_glyphs

clear_fighter_projectiles:
    jsr erase_fighter_projectile_overlays
    lda #$00
    ldx #(FIGHTER_PROJECTILE_SLOT_COUNT-1)
@slot:
    sta FIGHTER_PROJECTILE_ACTIVE,x
    sta FIGHTER_PROJECTILE_RENDERED,x
    dex
    bpl @slot
    sta VIPER_BURST_STATE
    sta VIPER_BURST_REMAINING
    sta VIPER_BURST_TIMER
    sta RAIDER_BURST_STATE
    sta RAIDER_BURST_REMAINING
    sta RAIDER_BURST_TIMER
    sta bullet_active
    rts

clear_viper_projectiles:
    jsr erase_fighter_projectile_overlays
    lda #$00
    ldx #(VIPER_PROJECTILE_SLOT_COUNT-1)
@slot:
    sta FIGHTER_PROJECTILE_ACTIVE,x
    sta FIGHTER_PROJECTILE_RENDERED,x
    dex
    bpl @slot
    sta VIPER_BURST_STATE
    sta VIPER_BURST_REMAINING
    sta VIPER_BURST_TIMER
    sta bullet_active
    rts

clear_raider_projectiles:
    jsr erase_fighter_projectile_overlays
    lda #$00
    ldx #(FIGHTER_PROJECTILE_SLOT_COUNT-1)
@slot:
    sta FIGHTER_PROJECTILE_ACTIVE,x
    sta FIGHTER_PROJECTILE_RENDERED,x
    dex
    cpx #(RAIDER_PROJECTILE_SLOT_BASE-1)
    bne @slot
    sta RAIDER_BURST_STATE
    sta RAIDER_BURST_REMAINING
    sta RAIDER_BURST_TIMER
    rts

erase_fighter_projectile_overlays:
    ldx #(FIGHTER_PROJECTILE_SLOT_COUNT-1)
@slot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    bne :+
    jmp @next
:
    lda FIGHTER_PROJECTILE_RENDERED,x
    beq @next
    lda FIGHTER_PROJECTILE_SCREEN_LO,x
    sta dst_ptr
    lda FIGHTER_PROJECTILE_SCREEN_HI,x
    sta dst_ptr+1
    ldy #$00
    lda FIGHTER_PROJECTILE_BACKUP_TOP,x
    sta (dst_ptr),y
    lda FIGHTER_PROJECTILE_Y,x
    and #$07
    sta row_counter
    cpx #VIPER_PROJECTILE_SLOT_COUNT
    bcc @viper_height
    lda #RAIDER_PROJECTILE_HEIGHT
    bne @height_ready
@viper_height:
    lda #VIPER_PROJECTILE_HEIGHT
@height_ready:
    clc
    adc row_counter
    cmp #$09
    bcc @restored
    ldy #40
    lda FIGHTER_PROJECTILE_BACKUP_BOTTOM,x
    sta (dst_ptr),y
@restored:
    lda #$00
    sta FIGHTER_PROJECTILE_RENDERED,x
@next:
    dex
    bpl @slot
    rts

update_fighter_projectiles:
    ldx #$00
@slot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @next
    dec FIGHTER_PROJECTILE_LIFETIME,x
    beq @free
    lda FIGHTER_PROJECTILE_ACTIVE,x
    cmp #FIGHTER_PROJECTILE_VIPER
    bne @raider
    lda FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    cmp #(GAMEPLAY_TOP+VIPER_PROJECTILE_SPEED)
    bcc @free
    sec
    sbc #VIPER_PROJECTILE_SPEED
    sta FIGHTER_PROJECTILE_Y,x
    jsr move_projectile_screen_pointer_up
    jsr viper_projectile_hits_enemy
    bcc @next
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda #$01
    ldy #DAMAGE_PLAYER_PROJECTILE
    jsr queue_enemy_damage
    jmp @next
@raider:
    lda FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    clc
    adc #RAIDER_PROJECTILE_SPEED
    sta FIGHTER_PROJECTILE_Y,x
    clc
    adc #RAIDER_PROJECTILE_HEIGHT
    cmp #(GAMEPLAY_BOTTOM+1)
    bcs @free
    jsr move_projectile_screen_pointer_down
    jsr raider_projectile_hits_player
    bcc @next
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda #ENEMY_PULSE_DAMAGE_UNITS
    stx BROAD_WORK_SLOT
    jsr apply_player_damage
    ldx BROAD_WORK_SLOT
    jmp @next
@free:
    lda #FIGHTER_PROJECTILE_FREE
    sta FIGHTER_PROJECTILE_ACTIVE,x
@next:
    inx
    cpx #FIGHTER_PROJECTILE_SLOT_COUNT
    bne @slot
    jmp refresh_bullet_active

move_projectile_screen_pointer_up:
    lda FIGHTER_PROJECTILE_PREV_Y,x
    and #$F8
    sta loader_repeat_value
    lda FIGHTER_PROJECTILE_Y,x
    and #$F8
    cmp loader_repeat_value
    beq @done
    sec
    lda FIGHTER_PROJECTILE_SCREEN_LO,x
    sbc #40
    sta FIGHTER_PROJECTILE_SCREEN_LO,x
    bcs @done
    dec FIGHTER_PROJECTILE_SCREEN_HI,x
@done:
    rts

move_projectile_screen_pointer_down:
    lda FIGHTER_PROJECTILE_PREV_Y,x
    and #$F8
    sta loader_repeat_value
    lda FIGHTER_PROJECTILE_Y,x
    and #$F8
    cmp loader_repeat_value
    beq @done
    clc
    lda FIGHTER_PROJECTILE_SCREEN_LO,x
    adc #40
    sta FIGHTER_PROJECTILE_SCREEN_LO,x
    bcc @done
    inc FIGHTER_PROJECTILE_SCREEN_HI,x
@done:
    rts

viper_projectile_hits_enemy:
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @miss
    lda FIGHTER_PROJECTILE_X,x
    cmp enemy_x
    bcc @miss
    ldy ENEMY_ARCHETYPE
    lda enemy_x
    clc
    adc enemy_visible_widths,y
    cmp FIGHTER_PROJECTILE_X,x
    bcc @miss
    beq @miss
    lda enemy_y
    clc
    adc enemy_frame_heights,y
    cmp FIGHTER_PROJECTILE_Y,x
    bcc @miss
    beq @miss
    lda FIGHTER_PROJECTILE_PREV_Y,x
    clc
    adc #(VIPER_PROJECTILE_HEIGHT-1)
    cmp enemy_y
    bcc @miss
    sec
    rts
@miss:
    clc
    rts

raider_projectile_hits_player:
    lda FIGHTER_PROJECTILE_X,x
    clc
    adc #RAIDER_PROJECTILE_WIDTH_HPOS
    cmp player_x
    bcc @miss
    beq @miss
    lda player_x
    clc
    adc #PLAYER_COLLISION_WIDTH
    cmp FIGHTER_PROJECTILE_X,x
    bcc @miss
    beq @miss
    lda FIGHTER_PROJECTILE_Y,x
    clc
    adc #(RAIDER_PROJECTILE_HEIGHT-1)
    cmp player_y
    bcc @miss
    lda player_y
    clc
    adc #PLAYER_COLLISION_LAST_ROW
    cmp FIGHTER_PROJECTILE_PREV_Y,x
    bcc @miss
    sec
    rts
@miss:
    clc
    rts

refresh_bullet_active:
    lda #$00
    sta bullet_active
    ldx #$00
@slot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    cmp #FIGHTER_PROJECTILE_VIPER
    bne @next
    lda #$01
    sta bullet_active
    rts
@next:
    inx
    cpx #VIPER_PROJECTILE_SLOT_COUNT
    bne @slot
    rts

update_viper_weapon:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @released
    cmp #PLAYER_GAME_OVER
    beq @released
    lda gameplay_fire_gate
    beq @released
    lda TRIG0
    bne @released
    lda VIPER_BURST_STATE
    cmp #WEAPON_BURST_FIRING
    beq @firing
    cmp #WEAPON_BURST_POST
    beq @post
@begin:
    lda #WEAPON_BURST_FIRING
    sta VIPER_BURST_STATE
    lda #VIPER_BURST_COUNT
    sta VIPER_BURST_REMAINING
    lda #$00
    sta VIPER_BURST_TIMER
@firing:
    lda VIPER_BURST_TIMER
    beq @emit
    dec VIPER_BURST_TIMER
    bne @done
@emit:
    jsr allocate_viper_projectile
    bcc @done                   ; rejected allocation is retried, not counted
    dec VIPER_BURST_REMAINING
    beq @finish
    lda #VIPER_BURST_INTERVAL
    sta VIPER_BURST_TIMER
    rts
@finish:
    lda #WEAPON_BURST_POST
    sta VIPER_BURST_STATE
    lda #VIPER_POST_BURST_PAUSE
    sta VIPER_BURST_TIMER
    rts
@post:
    dec VIPER_BURST_TIMER
    bne @done
    jmp @begin
@released:
    lda #WEAPON_BURST_WAITING
    sta VIPER_BURST_STATE
    lda #$00
    sta VIPER_BURST_REMAINING
    sta VIPER_BURST_TIMER
@done:
    rts

allocate_viper_projectile:
    ldx #$00
@find:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @allocate
    inx
    cpx #VIPER_PROJECTILE_SLOT_COUNT
    bne @find
    clc
    rts
@allocate:
    lda #FIGHTER_PROJECTILE_VIPER
    sta FIGHTER_PROJECTILE_ACTIVE,x
    lda player_x
    clc
    adc #(PLAYER_COLLISION_WIDTH/2)
    sta FIGHTER_PROJECTILE_X,x
    sta bullet_x
    lda player_y
    sec
    sbc #VIPER_PROJECTILE_HEIGHT
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    sta bullet_y
    lda #$FF
    sta FIGHTER_PROJECTILE_LIFETIME,x
    lda #$00
    sta FIGHTER_PROJECTILE_RENDERED,x
    jsr initialize_projectile_screen_pointer
    lda #$01
    sta bullet_active
    lda sound_enabled
    beq @accepted
    lda #$32
    sta AUDF1
    lda #$A8
    sta AUDC1
    lda #$07
    sta fire_timer
@accepted:
    sec
    rts

update_enemy_weapon_runtime:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bne @player_state
    jmp clear_raider_projectiles
@player_state:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @stop
    cmp #PLAYER_GAME_OVER
    beq @stop
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @stop
    ldx ENEMY_ARCHETYPE
    lda enemy_weapon_profiles,x
    cmp #ENEMY_WEAPON_SINGLE_PULSE
    bne @stop
    lda enemy_y
    cmp #GAMEPLAY_TOP
    bcc @stop
    clc
    adc enemy_frame_heights,x
    cmp #(GAMEPLAY_BOTTOM+1)
    bcs @stop
    lda RAIDER_BURST_STATE
    cmp #WEAPON_BURST_FIRING
    beq @firing
    cmp #WEAPON_BURST_POST
    beq @post
@begin:
    lda #WEAPON_BURST_FIRING
    sta RAIDER_BURST_STATE
    lda #RAIDER_BURST_COUNT
    sta RAIDER_BURST_REMAINING
    lda #$00
    sta RAIDER_BURST_TIMER
@firing:
    lda RAIDER_BURST_TIMER
    beq @emit
    dec RAIDER_BURST_TIMER
    bne @done
@emit:
    jsr allocate_raider_projectile
    bcc @done
    dec RAIDER_BURST_REMAINING
    beq @finish
    lda #RAIDER_BURST_INTERVAL
    sta RAIDER_BURST_TIMER
    rts
@finish:
    lda #WEAPON_BURST_POST
    sta RAIDER_BURST_STATE
    ldx DIFFICULTY_SETTING
    lda raider_post_burst_frames,x
    sta RAIDER_BURST_TIMER
    rts
@post:
    dec RAIDER_BURST_TIMER
    bne @done
    jmp @begin
@stop:
    lda #WEAPON_BURST_WAITING
    sta RAIDER_BURST_STATE
    lda #$00
    sta RAIDER_BURST_REMAINING
    sta RAIDER_BURST_TIMER
@done:
    rts

allocate_raider_projectile:
    ldx #RAIDER_PROJECTILE_SLOT_BASE
@find:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    beq @allocate
    inx
    cpx #FIGHTER_PROJECTILE_SLOT_COUNT
    bne @find
    clc
    rts
@allocate:
    lda #FIGHTER_PROJECTILE_RAIDER
    sta FIGHTER_PROJECTILE_ACTIVE,x
    stx BROAD_WORK_SLOT
    ldy ENEMY_ARCHETYPE
    lda enemy_visible_widths,y
    lsr
    clc
    adc enemy_x
    sec
    sbc #(RAIDER_PROJECTILE_WIDTH_HPOS/2)
    and #$FE                    ; two-pixel red core stays inside one ANTIC cell
    ldx BROAD_WORK_SLOT
    sta FIGHTER_PROJECTILE_X,x
    lda enemy_y
    ldy ENEMY_ARCHETYPE
    clc
    adc enemy_projectile_spawn_y_offsets,y
    sta FIGHTER_PROJECTILE_Y,x
    sta FIGHTER_PROJECTILE_PREV_Y,x
    lda #RAIDER_PROJECTILE_LIFETIME
    sta FIGHTER_PROJECTILE_LIFETIME,x
    lda #$00
    sta FIGHTER_PROJECTILE_RENDERED,x
    jsr initialize_projectile_screen_pointer
    sec
    rts

initialize_projectile_screen_pointer:
    stx BROAD_WORK_SLOT
    lda FIGHTER_PROJECTILE_Y,x
    sec
    sbc #GAMEPLAY_TOP
    lsr
    lsr
    lsr
    sta row_counter
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
@row:
    lda row_counter
    beq @column
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @row
@column:
    ldx BROAD_WORK_SLOT
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #GAMEPLAY_LEFT_HPOS
    lsr
    lsr
    clc
    adc dst_ptr
    sta FIGHTER_PROJECTILE_SCREEN_LO,x
    lda dst_ptr+1
    adc #$00
    sta FIGHTER_PROJECTILE_SCREEN_HI,x
    rts

render_fighter_projectile_overlays:
    ldx #$00
@slot:
    lda FIGHTER_PROJECTILE_ACTIVE,x
    bne :+
    jmp @next
:
    stx BROAD_WORK_SLOT
    lda FIGHTER_PROJECTILE_X,x
    sec
    sbc #GAMEPLAY_LEFT_HPOS
    and #$03
    sta loader_repeat_value
    lda FIGHTER_PROJECTILE_Y,x
    and #$07
    sta row_counter
    lda FIGHTER_PROJECTILE_ACTIVE,x
    cmp #FIGHTER_PROJECTILE_VIPER
    bne @raider_code
    ldy loader_repeat_value
    lda viper_projectile_group_offsets,y
    sta src_ptr
    clc
    adc row_counter
    adc #VIPER_PROJECTILE_GLYPH_BASE
    sta loader_repeat_value
    lda #$00
    sta src_ptr+1
    lda row_counter
    cmp #$07
    bne @code_ready
    lda src_ptr
    clc
    adc #(VIPER_PROJECTILE_GLYPH_BASE+8)
    sta src_ptr+1
    bne @code_ready
@raider_code:
    lda loader_repeat_value
    lsr
    tay
    lda raider_projectile_group_offsets,y
    sta src_ptr
    clc
    adc row_counter
    adc #RAIDER_PROJECTILE_GLYPH_BASE
    ora #$80
    sta loader_repeat_value
    lda #$00
    sta src_ptr+1
    lda row_counter
    cmp #$06
    bcc @code_ready
    sec
    sbc #$06
    clc
    adc src_ptr
    adc #(RAIDER_PROJECTILE_GLYPH_BASE+8)
    ora #$80
    sta src_ptr+1
@code_ready:

    lda FIGHTER_PROJECTILE_SCREEN_LO,x
    sta dst_ptr
    lda FIGHTER_PROJECTILE_SCREEN_HI,x
    sta dst_ptr+1
    ldy #$00
    lda (dst_ptr),y
    sta FIGHTER_PROJECTILE_BACKUP_TOP,x
    lda loader_repeat_value
    sta (dst_ptr),y
    lda src_ptr+1
    beq @rendered
    ldy #40
    lda (dst_ptr),y
    sta FIGHTER_PROJECTILE_BACKUP_BOTTOM,x
    lda src_ptr+1
    sta (dst_ptr),y
@rendered:
    lda #$01
    sta FIGHTER_PROJECTILE_RENDERED,x
    ldx BROAD_WORK_SLOT
@next:
    inx
    cpx #FIGHTER_PROJECTILE_SLOT_COUNT
    beq :+
    jmp @slot
:
    rts

; -----------------------------------------------------------------------------
; Enemy

.segment "BROADSIDE"

; The red pulse bank is a regular three-scanline shape at two horizontal
; phases. Building its twenty glyphs once saves 160 resident source bytes while
; producing the exact same charset bytes consumed by the release renderer.
build_raider_projectile_glyphs:
    lda #$00
    ldx #$00
@clear:
    sta CHARSET+RAIDER_PROJECTILE_GLYPH_BASE*8,x
    inx
    cpx #(RAIDER_PROJECTILE_GLYPH_COUNT*8)
    bne @clear
    lda #<(CHARSET+RAIDER_PROJECTILE_GLYPH_BASE*8)
    sta dst_ptr
    lda #>(CHARSET+RAIDER_PROJECTILE_GLYPH_BASE*8)
    sta dst_ptr+1
    lda #$00
    sta BROAD_WORK_SLOT
@group:
    ldy BROAD_WORK_SLOT
    lda raider_projectile_group_masks,y
    sta BROAD_WORK_VALUE
    ldx #$00
@glyph:
    ldy raider_projectile_start_rows,x
    lda raider_projectile_row_counts,x
    sta row_counter
@paint:
    lda BROAD_WORK_VALUE
    sta (dst_ptr),y
    iny
    dec row_counter
    bne @paint
    clc
    lda dst_ptr
    adc #$08
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    inx
    cpx #$0A
    bne @glyph
    inc BROAD_WORK_SLOT
    lda BROAD_WORK_SLOT
    cmp #$02
    bne @group
    rts

raider_projectile_group_masks:
    .byte $F0,$0F
raider_projectile_start_rows:
    .byte 0,1,2,3,4,5,6,7,0,0
raider_projectile_row_counts:
    .byte 3,3,3,3,3,3,2,1,1,2

begin_enemy_fighter_explosion:
    ldx ENEMY_ARCHETYPE
    lda enemy_x
    sec
    sbc enemy_visible_left_insets,x
    sta FIGHTER_EXPLOSION_X+FIGHTER_EXPLOSION_ENEMY_SLOT
    lda enemy_frame_heights,x
    sec
    sbc #SHARED_FIGHTER_EXPLOSION_HEIGHT
    lsr
    clc
    adc enemy_y
    sta FIGHTER_EXPLOSION_Y+FIGHTER_EXPLOSION_ENEMY_SLOT
    lda #SHARED_FIGHTER_EXPLOSION_TOTAL
    sta FIGHTER_EXPLOSION_TIMER+FIGHTER_EXPLOSION_ENEMY_SLOT
    rts

; Explosion PMG bytes are stationary and each visual phase is held for four
; frames. Clear them once at expiry instead of restoring/redrawing every PAL
; frame; the phase renderer overwrites all eight bytes on each phase boundary.
erase_shared_fighter_explosion_slot:
    lda #SHARED_FIGHTER_EXPLOSION_HEIGHT
    sta loader_repeat_value
    ldy FIGHTER_EXPLOSION_Y,x
@row:
    cpy #GAMEPLAY_TOP
    bcc @advance
    cpy #GAMEPLAY_BOTTOM
    bcs @advance
    lda #$00
    cpx #FIGHTER_EXPLOSION_VIPER_SLOT
    bne @enemy
    sta PLAYER0,y
    sta PLAYER3,y
    jmp @advance
@enemy:
    sta PLAYER1,y
    sta PLAYER2,y
@advance:
    iny
    dec loader_repeat_value
    bne @row
    rts

render_shared_fighter_explosions:
    ldx #$00
@slot:
    lda FIGHTER_EXPLOSION_TIMER,x
    beq @next
    and #(SHARED_FIGHTER_EXPLOSION_FRAME_DURATION-1)
    bne @next
    stx BROAD_WORK_SLOT
    lda #SHARED_FIGHTER_EXPLOSION_TOTAL
    sec
    sbc FIGHTER_EXPLOSION_TIMER,x
    lsr
    lsr
    tay
    lda shared_fighter_explosion_core_masks,y
    sta BROAD_WORK_COUNT
    tya
    asl
    asl
    asl
    tax
    ldy BROAD_WORK_SLOT
    lda FIGHTER_EXPLOSION_X,y
    cpy #FIGHTER_EXPLOSION_VIPER_SLOT
    bne @enemy_hpos
    sta HPOSP0
    sta HPOSP3
    jmp @positioned
@enemy_hpos:
    sta HPOSP1
    sta HPOSP2
@positioned:
    lda FIGHTER_EXPLOSION_Y,y
    sta row_counter
    lda #SHARED_FIGHTER_EXPLOSION_HEIGHT
    sta BROAD_WORK_VALUE
@row:
    lda shared_fighter_explosion_masks,x
    sta loader_repeat_value
    ldy row_counter
    cpy #GAMEPLAY_TOP
    bcc @row_done
    cpy #GAMEPLAY_BOTTOM
    bcs @row_done
    lda BROAD_WORK_SLOT
    bne @enemy_row
    lda loader_repeat_value
    sta PLAYER3,y
    and BROAD_WORK_COUNT
    sta PLAYER0,y
    jmp @row_done
@enemy_row:
    lda loader_repeat_value
    sta PLAYER2,y
    and BROAD_WORK_COUNT
    sta PLAYER1,y
@row_done:
    inc row_counter
    inx
    dec BROAD_WORK_VALUE
    bne @row
    ldx BROAD_WORK_SLOT
@next:
    inx
    cpx #SHARED_FIGHTER_EXPLOSION_SLOT_COUNT
    bne @slot
    rts

update_enemy:
.if ENEMY_REVIEW_HARNESS
    jmp update_enemy_review_harness
.endif
    lda ENEMY_ACTIVE
    cmp #ENEMY_EXPLODING_STATE
    bne @active
    lda FIGHTER_EXPLOSION_TIMER+FIGHTER_EXPLOSION_ENEMY_SLOT
    beq @reset
    rts
@reset:
    jmp reset_enemy
@active:
    cmp #ENEMY_ACTIVE_STATE
    beq @live
    rts
@live:
    jsr erase_enemy

    inc enemy_y
    lda enemy_y
    cmp #GAMEPLAY_BOTTOM
    bcc @horizontal
    jmp reset_enemy

@horizontal:
    jsr update_raider_soft_pursuit

@scanner:
    jsr update_enemy_animation

draw_enemy:
    jsr clamp_enemy_x
    ldx ENEMY_ARCHETYPE
    lda enemy_size_modes,x
    sta SIZEP1
    sta SIZEP2
    lda enemy_x
    sec
    sbc enemy_visible_left_insets,x
    sta HPOSP1
    sta HPOSP2
    lda enemy_frame_heights,x
    sta row_counter
    txa                           ; fixed 16-byte frame stride
    asl
    asl
    asl
    asl
    tax
    ldy enemy_y
@body_loop:
    lda enemy_body_data,x
    cpy #GAMEPLAY_TOP
    bcc @body_next
    cpy #GAMEPLAY_BOTTOM
    bcs @body_done
    sta PLAYER1,y
@body_next:
    iny
    inx
    dec row_counter
    bne @body_loop
@body_done:

    ldx ENEMY_ARCHETYPE
    ldy enemy_y
    tya
    clc
    adc enemy_accent_rows,x
    tay
    cpy #GAMEPLAY_TOP
    bcc @accent_done
    cpy #GAMEPLAY_BOTTOM
    bcs @accent_done
    lda scanner_phase
    lsr
    lsr
    lsr
    clc
    adc enemy_accent_offsets,x
    tax
    lda enemy_accent_data,x
    sta PLAYER2,y
@accent_done:
    rts

erase_enemy:
    ldx ENEMY_ARCHETYPE
    lda enemy_frame_heights,x
    tax
    ldy enemy_y
    lda #$00
@loop:
    cpy #GAMEPLAY_TOP
    bcc @erase_next
    cpy #GAMEPLAY_BOTTOM
    bcs @erase_done
    sta PLAYER1,y
    sta PLAYER2,y
@erase_next:
    iny
    dex
    bne @loop
@erase_done:
    rts

reset_enemy:
    lda #ENEMY_INACTIVE
    sta ENEMY_ACTIVE
    ldx ENEMY_ARCHETYPE
    lda #GAMEPLAY_TOP
    sec
    sbc enemy_frame_heights,x
    sta enemy_y
    lda enemy_logical_x_maxs,x
    sec
    sbc #CORRIDOR_LEFT_HPOS
    clc
    adc #$01
    sta row_counter
    jsr random_byte
    and #$7F
    cmp row_counter
    bcc :+
    eor #$7F
:
    ldx ENEMY_ARCHETYPE
    clc
    adc #CORRIDOR_LEFT_HPOS
    sta enemy_x
    lda #$00
    sta enemy_velocity_x
    sta RAIDER_MOVE_ACCUMULATOR
    lda #ENEMY_ACTIVE_STATE
    sta ENEMY_ACTIVE
    ldx ENEMY_ARCHETYPE
    lda enemy_hit_points,x
    sta ENEMY_HP
    jsr reset_enemy_fire_cooldown
    jmp draw_enemy

reset_enemy_fire_cooldown:
    lda #WEAPON_BURST_WAITING
    sta RAIDER_BURST_STATE
    lda #$00
    sta RAIDER_BURST_REMAINING
    sta RAIDER_BURST_TIMER
    rts

update_enemy_weapon:
    jmp update_enemy_weapon_runtime

clear_raider_pulses:
    jmp clear_raider_projectiles

; The logical coordinate is the first visible HPOS unit, not necessarily the
; PMG byte origin. Per-archetype insets and widths keep transparent padding
; non-colliding and prevent every animation phase from entering a hull band.
clamp_enemy_x:
    ldx ENEMY_ARCHETYPE
    lda enemy_x
    cmp #CORRIDOR_LEFT_HPOS
    bcs @right
    lda #CORRIDOR_LEFT_HPOS
    sta enemy_x
    lda #$00
    sta enemy_velocity_x
    sta RAIDER_MOVE_ACCUMULATOR
    rts
@right:
    cmp enemy_logical_x_maxs,x
    bcc @done
    beq @done
    lda enemy_logical_x_maxs,x
    sta enemy_x
    lda #$00
    sta enemy_velocity_x
    sta RAIDER_MOVE_ACCUMULATOR
@done:
    rts

; The release Raider samples a Viper-centred target every eight PAL frames,
; retaining a small deterministic weave. Signed velocity is bounded to
; -1/0/+1 direction. Reversal passes through zero for one sample period. The
; fractional movement clock advances two HPOS on exactly seven of eight active
; frames, giving a maximum 14/16 = 7/8 of Viper lateral speed.
update_raider_soft_pursuit:
    lda frame_counter
    and #(RAIDER_TARGET_SAMPLE_INTERVAL-1)
    bne @move

    ; Signed target delta: Viper centre minus Raider centre, plus weave.
    lda frame_counter
    and #(RAIDER_WEAVE_PERIOD_FRAMES/2)
    beq @weave_left
    lda #RAIDER_WEAVE_AMPLITUDE
    bne @have_weave
@weave_left:
    lda #($100-RAIDER_WEAVE_AMPLITUDE)
@have_weave:
    clc
    adc player_x
    sec
    sbc enemy_x
    sbc #((ENEMY_RELEASE_VISIBLE_WIDTH-PLAYER_COLLISION_WIDTH)/2)
@classify:
    cmp #(RAIDER_TARGET_DEAD_ZONE+1)
    bcc @stop
    cmp #$80
    bcc @right
    cmp #($100-RAIDER_TARGET_DEAD_ZONE)
    bcs @stop
@left:
    lda enemy_velocity_x
    cmp #$01
    beq @stop
    lda #$FF
    bne @store
@right:
    lda enemy_velocity_x
    bmi @stop
    lda #$01
    bne @store
@stop:
    lda #$00
@store:
    sta enemy_velocity_x
@move:
    lda enemy_velocity_x
    bne @accumulate
    sta RAIDER_MOVE_ACCUMULATOR
    rts
@accumulate:
    lda RAIDER_MOVE_ACCUMULATOR
    clc
    adc #RAIDER_SPEED_NUMERATOR
    cmp #RAIDER_SPEED_DENOMINATOR
    bcs @advance
    sta RAIDER_MOVE_ACCUMULATOR
    rts
@advance:
    sbc #RAIDER_SPEED_DENOMINATOR
    sta RAIDER_MOVE_ACCUMULATOR
    lda enemy_velocity_x
    bmi @move_left
    inc enemy_x
    inc enemy_x
    bne @clamp
@move_left:
    dec enemy_x
    dec enemy_x
@clamp:
    jmp clamp_enemy_x

update_enemy_animation:
    inc scanner_phase
    lda scanner_phase
    cmp #ENEMY_ANIMATION_CYCLE_FRAMES
    bcc @done
    lda #$00
    sta scanner_phase
@done:
    rts

; Carry clear selects one of the three implemented anchors. Invalid and future
; inventory IDs are rejected without touching the live renderer state.
set_enemy_archetype:
    cmp #ENEMY_IMPLEMENTED_COUNT
    bcs @invalid
    cmp ENEMY_ARCHETYPE
    beq @valid
    sta ENEMY_ARCHETYPE
    lda #$00
    sta scanner_phase
@valid:
    clc
    rts
@invalid:
    sec
    rts

.if ENEMY_REVIEW_HARNESS
; Compile-time-only deterministic review cycle. Normal release assembly omits
; this routine and always spawns ENEMY_RELEASE_ARCHETYPE through init_state.
update_enemy_review_harness:
    jsr erase_enemy
    lda #$78
    sta enemy_y
    lda frame_counter
    cmp #80
    bcc @raider
    cmp #160
    bcc @talon
    cmp #240
    bcc @bomber
    and #$03                    ; rapid, safely erased type changes
    cmp #ENEMY_IMPLEMENTED_COUNT
    bcc @select
@raider:
    lda #ENEMY_ARCHETYPE_RAIDER
    jmp @select
@talon:
    lda #ENEMY_ARCHETYPE_TALON
    bne @select
@bomber:
    lda #ENEMY_ARCHETYPE_SCYTHE_BOMBER
@select:
    jsr set_enemy_archetype
    jsr update_enemy_animation
    lda frame_counter
    and #$30
    cmp #$10
    beq @left
    cmp #$20
    beq @right
    ldx ENEMY_ARCHETYPE
    lda #CORRIDOR_LEFT_HPOS
    clc
    adc enemy_logical_x_maxs,x
    lsr
    jmp @position
@left:
    ldx ENEMY_ARCHETYPE
    lda #CORRIDOR_LEFT_HPOS
    bne @position
@right:
    ldx ENEMY_ARCHETYPE
    lda enemy_logical_x_maxs,x
@position:
    sta enemy_x
    jmp draw_enemy
.endif

.segment "STARFIELD"

; -----------------------------------------------------------------------------
; Collision and score

; Shared world-scroll tail lives in the main block because the relocated
; BROADSIDE block is intentionally capped at $740F.  A coincident hull step
; performs this work after both copies and bypasses this tail.
restore_and_redraw_muzzles:
    jsr restore_boundary_stars
    jmp redraw_visible_muzzles

handle_collisions:
    lda #$00
    sta ENEMY_PENDING_DAMAGE
    lda #DAMAGE_CLEANUP
    sta ENEMY_PENDING_SOURCE

    jsr update_fighter_projectiles

@player_collision:
    jsr player_contacts_enemy   ; logical collision remains active while blinking
    beq @heavy_projectiles
    lda #$01
    ldy #DAMAGE_PLAYER_CONTACT
    jsr queue_enemy_damage
    ldx #$00
    jsr apply_broadside_player_damage

@heavy_projectiles:
    jsr update_broadside
    jsr resolve_enemy_damage
@clear_latches:
    lda #$00
    sta HITCLR
    rts

; A carries a bounded damage amount and Y an explicit credit source. Multiple
; hits in one PAL frame accumulate damage but retain the highest score-credit
; priority (the lowest source value). Destruction is resolved exactly once.
queue_enemy_damage:
    pha
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @inactive
    pla
    clc
    adc ENEMY_PENDING_DAMAGE
    bcc :+
    lda #$FF
:
    sta ENEMY_PENDING_DAMAGE
    tya
    cmp ENEMY_PENDING_SOURCE
    bcs @done
    sta ENEMY_PENDING_SOURCE
@done:
    rts
@inactive:
    pla
    rts

resolve_enemy_damage:
    lda ENEMY_PENDING_DAMAGE
    beq @done
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @done
    lda ENEMY_HP
    sec
    sbc ENEMY_PENDING_DAMAGE
    bcc @destroy
    beq @destroy
    sta ENEMY_HP
    rts
@destroy:
    lda ENEMY_PENDING_SOURCE
    pha
    jsr erase_enemy
    lda #ENEMY_EXPLODING_STATE
    sta ENEMY_ACTIVE
    lda #$00
    sta enemy_velocity_x
    sta HITCLR
    jsr begin_enemy_fighter_explosion
    jsr reset_enemy_fire_cooldown
    pla
    cmp #(DAMAGE_CAPITAL_CYLON+1)
    bcs @no_score
    jsr add_archetype_score
@no_score:
    jsr play_hit_sound
@done:
    rts

; The score is descriptor data, not a Raider collision constant. A is the
; already-arbitrated lethal source; all score-awarding sources share this path.
add_archetype_score:
    ldx ENEMY_ARCHETYPE
    sed
    clc
    lda score_bcd_lo
    adc enemy_scores,x
    sta score_bcd_lo
    lda score_bcd_hi
    adc #$00
    sta score_bcd_hi
    cld
    jsr update_top_score
    jmp update_score_display

; Packed BCD bytes preserve numeric ordering, so a high-byte/low-byte compare
; implements TOP = max(TOP, SCORE) without converting the score.
update_top_score:
    lda score_bcd_hi
    cmp TOP_SCORE_BCD_HI
    bcc @done
    bne @store
    lda score_bcd_lo
    cmp TOP_SCORE_BCD_LO
    bcc @done
    beq @done
@store:
    lda score_bcd_lo
    sta TOP_SCORE_BCD_LO
    lda score_bcd_hi
    sta TOP_SCORE_BCD_HI
@done:
    rts

; The frontend table has six score columns. The gameplay counter is four BCD
; digits, so the template keeps two leading zeroes and this routine writes the
; remaining four digits into the first (session TOP) row.
.segment "BROADSIDE"
draw_session_top_score:
    ldx #$00
    lda TOP_SCORE_BCD_HI
    jsr draw_top_score_bcd_byte
    lda TOP_SCORE_BCD_LO
draw_top_score_bcd_byte:
    pha
    lsr
    lsr
    lsr
    lsr
    clc
    adc #CH_FRONT_ZERO
    sta SCREEN+5*40+23,x
    inx
    pla
    and #$0F
    clc
    adc #CH_FRONT_ZERO
    sta SCREEN+5*40+23,x
    inx
    rts

.segment "STARFIELD"

player_contacts_enemy:
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @miss
    lda player_x
    clc
    adc #PLAYER_COLLISION_WIDTH
    cmp enemy_x
    bcc @miss
    beq @miss
    ldx ENEMY_ARCHETYPE
    lda enemy_x
    clc
    adc enemy_visible_widths,x
    cmp player_x
    bcc @miss
    beq @miss
    lda player_y
    clc
    adc #(PLAYER_COLLISION_LAST_ROW+1)
    cmp enemy_y
    bcc @miss
    beq @miss
    lda enemy_y
    clc
    adc enemy_frame_heights,x
    cmp player_y
    bcc @miss
    beq @miss
    lda #$01
    rts
@miss:
    lda #$00
    rts

update_score_display:
    lda #CH_ZERO
    sta SCREEN+6

    lda score_bcd_hi
    lsr
    lsr
    lsr
    lsr
    clc
    adc #CH_ZERO
    sta SCREEN+7

    lda score_bcd_hi
    and #$0F
    clc
    adc #CH_ZERO
    sta SCREEN+8

    lda score_bcd_lo
    lsr
    lsr
    lsr
    lsr
    clc
    adc #CH_ZERO
    sta SCREEN+9

    lda score_bcd_lo
    and #$0F
    clc
    adc #CH_ZERO
    sta SCREEN+10
    rts

; -----------------------------------------------------------------------------
; Starfield. This separately relocated block occupies the otherwise unused
; gap between projectile state and BROADSIDE; neither constrained block grows.

.segment "STARFIELD"

update_starfield:
    ldx DIFFICULTY_SETTING
    lda scroll_accumulator
    clc
    adc world_scroll_rates,x
    cmp #WORLD_SCROLL_RATE_DENOMINATOR
    bcs @world_scroll
    sta scroll_accumulator
    jmp @hull_rate
@world_scroll:
    sbc #WORLD_SCROLL_RATE_DENOMINATOR
    sta scroll_accumulator
    jsr advance_starfield_layers
@hull_rate:
    ldx DIFFICULTY_SETTING
    lda HULL_SCROLL_ACCUMULATOR
    clc
    adc hull_scroll_rates,x
    cmp #HULL_SCROLL_RATE_DENOMINATOR
    bcs @hull_scroll
    sta HULL_SCROLL_ACCUMULATOR
    ; A legacy-world clock event leaves boundary/muzzle finalization pending so
    ; that the coincident hull step can perform it once after both copies. With the
    ; fixed-point accumulator, a post-subtraction world value is always less
    ; than the active numerator; a non-step value is always at least it.
    lda scroll_accumulator
    cmp world_scroll_rates,x
    bcc @finalize_world
    rts
@finalize_world:
    jmp restore_and_redraw_muzzles
@hull_scroll:
    sbc #HULL_SCROLL_RATE_DENOMINATOR
    sta HULL_SCROLL_ACCUMULATOR
    jmp scroll_hull_columns

; The legacy world clock is now the 100% hull reference. Near and far layers
; use independent exact fixed-point ratios against each hull/world event:
; 7/10 (70%) and 7/20 (35%). Both remain bounded to at most one row per event.
advance_starfield_layers:
    lda #$00
    sta STAR_GENERATION_FLAGS
    lda STAR_NEAR_PHASE
    clc
    adc #STAR_NEAR_RATE_NUMERATOR
    cmp #STAR_NEAR_RATE_DENOMINATOR
    bcs @near_step
    sta STAR_NEAR_PHASE
    jmp @far_rate
@near_step:
    sbc #STAR_NEAR_RATE_DENOMINATOR
    sta STAR_NEAR_PHASE
    lda #STAR_GENERATE_NEAR
    sta STAR_GENERATION_FLAGS
@far_rate:
    lda STAR_FAR_PHASE
    clc
    adc #STAR_FAR_RATE_NUMERATOR
    cmp #STAR_FAR_RATE_DENOMINATOR
    bcs @far_step
    sta STAR_FAR_PHASE
    jmp @dispatch
@far_step:
    sbc #STAR_FAR_RATE_DENOMINATOR
    sta STAR_FAR_PHASE
    lda STAR_GENERATION_FLAGS
    ora #STAR_GENERATE_FAR
    sta STAR_GENERATION_FLAGS
@dispatch:
    lda STAR_GENERATION_FLAGS
    beq @done
    jsr erase_far_star_overlays
    lda STAR_GENERATION_FLAGS
    and #STAR_GENERATE_NEAR
    beq @far_dispatch
    jsr scroll_world_columns
@far_dispatch:
    lda STAR_GENERATION_FLAGS
    and #STAR_GENERATE_FAR
    beq @mark_dirty
    jsr advance_far_stars
@mark_dirty:
    lda #$80
    sta STAR_GENERATION_FLAGS
@done:
    rts

; The 24-column star corridor keeps the accepted gameplay difficulty cadence.
; Only columns 9..30 live directly in screen memory. Columns 8 and 31 have a
; 46-byte backing store because a slower hull-mounted muzzle may cover them.
scroll_world_columns:

    lda #<(SCREEN+23*40)
    sta dst_ptr
    lda #>(SCREEN+23*40)
    sta dst_ptr+1
    lda #<(SCREEN+22*40)
    sta src_ptr
    lda #>(SCREEN+22*40)
    sta src_ptr+1
    lda #(GAMEPLAY_SCREEN_ROWS-1)
    sta row_counter

@copy_row:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_COMPLETE
    bne @copy_corridor
    ldy #39
@copy_full:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    bpl @copy_full
    jmp @row_done
@copy_corridor:
    ldy #(CORRIDOR_CENTRAL_END-2)
@copy_byte:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    cpy #CORRIDOR_CENTRAL_FIRST
    bne @copy_byte
@row_done:
    sec
    lda src_ptr
    sbc #40
    sta src_ptr
    bcs :+
    dec src_ptr+1
:
    sec
    lda dst_ptr
    sbc #40
    sta dst_ptr
    bcs :+
    dec dst_ptr+1
:
    dec row_counter
    bne @copy_row

    ldx #(CAPITAL_HULL_VISIBLE_ROWS-1)
@shift_boundaries:
    lda CORRIDOR_BOUNDARY_LEFT-1,x
    sta CORRIDOR_BOUNDARY_LEFT,x
    lda CORRIDOR_BOUNDARY_RIGHT-1,x
    sta CORRIDOR_BOUNDARY_RIGHT,x
    dex
    bne @shift_boundaries

    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
    jsr generate_starfield_row
    ldy #CORRIDOR_CENTRAL_FIRST
    lda (dst_ptr),y
    sta CORRIDOR_BOUNDARY_LEFT
    ldy #(CORRIDOR_CENTRAL_END-1)
    lda (dst_ptr),y
    sta CORRIDOR_BOUNDARY_RIGHT
    rts

; Scalar state is reset before the initial near rows are generated. Sparse far
; records are populated afterwards so they only claim completed blank cells.
init_starfield_state:
    lda #$00
    sta STAR_NEAR_PHASE
    sta STAR_FAR_PHASE
    sta STAR_TWINKLE_SLOT
    sta STAR_GENERATION_FLAGS
    lda #STAR_TWINKLE_INTERVAL
    sta STAR_TWINKLE_TIMER
    ldx #(STAR_FAR_CAPACITY-1)
@clear:
    lda #$00
    sta STAR_FAR_ACTIVE,x
    sta STAR_FAR_SCREEN_LO,x
    sta STAR_FAR_SCREEN_HI,x
    sta STAR_FAR_CODE,x
    dex
    bpl @clear
    rts

build_star_glyphs:
    ldx #$00
@byte:
    lda star_glyph_bytes,x
    sta CHARSET+STAR_FAR_FIRST*8,x
    inx
    cpx #((STAR_NEAR_END-STAR_FAR_FIRST)*8)
    bne @byte
    rts

; Initial setup distributes exactly 24 logical far stars over the 23 gameplay
; rows. Cells already occupied by a near star remain logically present but are
; not drawn until their next 35%-rate step reaches clear background.
init_far_star_population:
    ldx #$00
@slot:
    lda #$01
    sta STAR_FAR_ACTIVE,x
    jsr star_random_byte
    and #$1F
    cmp #GAMEPLAY_SCREEN_ROWS
    bcc :+
    sec
    sbc #GAMEPLAY_SCREEN_ROWS
:
    sta row_counter
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
@row:
    lda row_counter
    beq @column
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @row
@column:
    jsr choose_far_star_column
    clc
    adc dst_ptr
    sta STAR_FAR_SCREEN_LO,x
    lda dst_ptr+1
    adc #$00
    sta STAR_FAR_SCREEN_HI,x
    jsr choose_far_star_code
    sta STAR_FAR_CODE,x
    inx
    cpx #STAR_FAR_CAPACITY
    bne @slot
    jmp render_far_star_overlays

; The near layer is authoritative character background. At most one star is
; introduced in a newly exposed row, keeping generation bounded and sparse.
generate_near_star_row:
    jsr star_random_byte
    and #(STAR_DENSITY_DENOMINATOR-1)
    cmp #STAR_NEAR_DENSITY_NUMERATOR
    bcs @done
    jsr choose_star_column
    tay
    lda (dst_ptr),y
    bne @done
    jsr star_random_byte
    and #(STAR_SPECIAL_FREQUENCY-1)
    beq @sparkle
    cmp #$02
    bcc @double
    lda #STAR_NEAR_POINT
    bne @store
@double:
    lda #STAR_NEAR_DOUBLE
    bne @store
@sparkle:
    lda #STAR_NEAR_SPARKLE
@store:
    sta (dst_ptr),y
@done:
    rts

choose_star_column:
    jsr star_random_byte
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_COMPLETE
    bne @corridor
    lda STAR_RNG_STATE
    and #$3F
    cmp #40
    bcc @done
    sec
    sbc #40
@done:
    rts
@corridor:
    lda STAR_RNG_STATE
    and #$1F
    cmp #22
    bcc :+
    sec
    sbc #22
:
    clc
    adc #(CORRIDOR_CENTRAL_FIRST+1)
    rts

; Boundary cells 8/31 are part of the legal flight corridor, but the hull
; projection code temporarily owns them for source muzzles. Persistent far
; overlays therefore use the safe 22-cell interior until COMPLETE.
choose_far_star_column:
    jsr star_random_byte
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_COMPLETE
    bne @corridor
    lda STAR_RNG_STATE
    and #$3F
    cmp #40
    bcc @done
    sec
    sbc #40
@done:
    rts
@corridor:
    lda STAR_RNG_STATE
    and #$1F
    cmp #22
    bcc :+
    sec
    sbc #22
:
    clc
    adc #(CORRIDOR_CENTRAL_FIRST+1)
    rts

choose_far_star_code:
    jsr star_random_byte
    and #$07
    cmp #$05
    bcc @dim
    beq @bright
    lda #STAR_FAR_SHIFTED
    rts
@bright:
    lda #STAR_FAR_BRIGHT
    rts
@dim:
    lda #STAR_FAR_DIM
    rts

star_random_byte:
    lda STAR_RNG_STATE
    lsr
    bcc :+
    eor #$B8
:
    sta STAR_RNG_STATE
    rts

erase_far_star_overlays:
    ldx #(STAR_FAR_CAPACITY-1)
@slot:
    lda STAR_FAR_ACTIVE,x
    bpl @next
    and #$7F
    sta STAR_FAR_ACTIVE,x
    lda STAR_FAR_SCREEN_LO,x
    sta dst_ptr
    lda STAR_FAR_SCREEN_HI,x
    sta dst_ptr+1
    ldy #$00
    lda #CH_SPACE
    sta (dst_ptr),y
@next:
    dex
    bpl @slot
    rts

render_far_star_overlays:
    ldx #$00
@slot:
    lda STAR_FAR_ACTIVE,x
    cmp #$01
    bne @next
    lda STAR_FAR_SCREEN_LO,x
    sta dst_ptr
    lda STAR_FAR_SCREEN_HI,x
    sta dst_ptr+1
    ldy #$00
    lda (dst_ptr),y
    bne @next                       ; near stars and gameplay backing win
    lda STAR_FAR_CODE,x
    sta (dst_ptr),y
    lda #$81
    sta STAR_FAR_ACTIVE,x
@next:
    inx
    cpx #STAR_FAR_CAPACITY
    bne @slot
    rts

; Far stars persist as composed background until a world-scroll step erases
; them.  Revisit the bounded 24-slot population only after that step rather
; than scanning it on every PAL frame.
render_far_star_overlays_if_needed:
    lda STAR_GENERATION_FLAGS
    beq @done
    lda #$00
    sta STAR_GENERATION_FLAGS
    jmp render_far_star_overlays
@done:
    rts

advance_far_stars:
    ldx #$00
@slot:
    lda STAR_FAR_ACTIVE,x
    beq @next
    clc
    lda STAR_FAR_SCREEN_LO,x
    adc #40
    sta STAR_FAR_SCREEN_LO,x
    lda STAR_FAR_SCREEN_HI,x
    adc #$00
    sta STAR_FAR_SCREEN_HI,x
    cmp #>GAMEPLAY_SCREEN_END
    bcc @next
    bne @respawn
    lda STAR_FAR_SCREEN_LO,x
    cmp #<GAMEPLAY_SCREEN_END
    bcc @next
@respawn:
    jsr choose_far_star_column
    clc
    adc #<GAMEPLAY_SCREEN
    sta STAR_FAR_SCREEN_LO,x
    lda #>GAMEPLAY_SCREEN
    adc #$00
    sta STAR_FAR_SCREEN_HI,x
    jsr choose_far_star_code
    sta STAR_FAR_CODE,x
    lda #$01
    sta STAR_FAR_ACTIVE,x
@next:
    inx
    cpx #STAR_FAR_CAPACITY
    bne @slot
    rts

tick_star_twinkle:
    dec STAR_TWINKLE_TIMER
    bne @done
    lda #STAR_TWINKLE_INTERVAL
    sta STAR_TWINKLE_TIMER
    inc STAR_TWINKLE_SLOT
    lda STAR_TWINKLE_SLOT
    cmp #STAR_FAR_CAPACITY
    bcc :+
    lda #$00
    sta STAR_TWINKLE_SLOT
:
    tax
    lda STAR_FAR_ACTIVE,x
    bpl @done                         ; hidden/covered stars hold their phase
    lda STAR_FAR_CODE,x
    sta loader_repeat_value
    lda STAR_FAR_SCREEN_LO,x
    sta dst_ptr
    lda STAR_FAR_SCREEN_HI,x
    sta dst_ptr+1
    ldy #$00
    lda (dst_ptr),y
    cmp loader_repeat_value
    bne @done                         ; never change through an overlay owner
    lda loader_repeat_value
    cmp #STAR_FAR_BRIGHT
    beq @dim
    lda #STAR_FAR_BRIGHT
    bne @store
@dim:
    lda #STAR_FAR_DIM
@store:
    sta STAR_FAR_CODE,x
    lda STAR_FAR_CODE,x
    sta (dst_ptr),y
@done:
    rts

star_glyph_bytes:
    EMIT_STAR_GLYPHS

.assert * - star_glyph_bytes = (STAR_NEAR_END-STAR_FAR_FIRST)*8, error, "star glyph byte count changed"
.assert * - __STARFIELD_RUN__ <= $08B6, error, "starfield runtime exceeds the pre-broadside gap"

.segment "BROADSIDE"

; The two eight-column hull masses advance at 100% of the legacy world clock.
; Muzzle projections are restored from source metadata after the bases move,
; and attached WARNING slots receive exactly the same eight-scanline step.
scroll_hull_columns:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_COMPLETE
    bne :+
    rts
:
    jsr restore_boundary_stars

    lda #<(SCREEN+23*40)
    sta dst_ptr
    lda #>(SCREEN+23*40)
    sta dst_ptr+1
    lda #<(SCREEN+22*40)
    sta src_ptr
    lda #>(SCREEN+22*40)
    sta src_ptr+1
    lda #(GAMEPLAY_SCREEN_ROWS-1)
    sta row_counter
@copy_hull_row:
    ldy #(CORRIDOR_ALLIED_COLUMNS-1)
@copy_allied:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    bpl @copy_allied
    ldy #39
@copy_enemy:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    cpy #(CORRIDOR_ENEMY_FIRST-1)
    bne @copy_enemy

    sec
    lda src_ptr
    sbc #40
    sta src_ptr
    bcs :+
    dec src_ptr+1
:
    sec
    lda dst_ptr
    sbc #40
    sta dst_ptr
    bcs :+
    dec dst_ptr+1
:
    dec row_counter
    bne @copy_hull_row

    jsr scroll_broadside_scene
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bcs @drain_row
    jsr draw_hull_row
    inc corridor_phase
    lda BROAD_VISIBLE_SCROLLS
    cmp #CAPITAL_HULL_VISIBLE_ROWS
    bcs :+
    inc BROAD_VISIBLE_SCROLLS
:
    jsr update_sector_state
    jmp @redraw
@drain_row:
    jsr clear_top_hull_row
    lda CAPITAL_SECTOR_DRAIN_ROWS
    cmp #CAPITAL_HULL_VISIBLE_ROWS
    bcs @redraw
    inc CAPITAL_SECTOR_DRAIN_ROWS
@redraw:
    jsr redraw_visible_muzzles
    jsr reset_exited_turret_lifecycles
    rts

clear_top_hull_row:
    lda #CH_SPACE
    ldy #(CORRIDOR_ALLIED_COLUMNS-1)
@allied:
    sta (dst_ptr),y
    dey
    bpl @allied
    ldy #39
@enemy:
    sta (dst_ptr),y
    dey
    cpy #(CORRIDOR_ENEMY_FIRST-1)
    bne @enemy
    rts

update_sector_state:
    lda corridor_phase
    cmp #CAPITAL_HULL_SECTION_ENGINES_END
    bcc @engines
    cmp #CAPITAL_HULL_SECTION_AFT_END
    bcc @aft
    cmp #CAPITAL_HULL_SECTION_COMBAT_END
    bcc @combat
    cmp #CAPITAL_HULL_SECTION_FORWARD_END
    bcc @forward
    cmp #CAPITAL_HULL_STREAM_ROWS
    bcc @prow
    lda #CAPITAL_HULL_STATE_DRAIN
    bne @store
@engines:
    lda #CAPITAL_HULL_STATE_ENGINES
    beq @store
@aft:
    lda #CAPITAL_HULL_STATE_AFT
    bne @store
@combat:
    lda #CAPITAL_HULL_STATE_COMBAT
    bne @store
@forward:
    lda #CAPITAL_HULL_STATE_FORWARD
    bne @store
@prow:
    lda #CAPITAL_HULL_STATE_PROW
@store:
    sta CAPITAL_SECTOR_STATE
    rts

; Restore the two nominal corridor-boundary columns from the independent star
; stream. Hull muzzle projections are added afterwards, never baked into this
; backing store.
restore_boundary_stars:
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
    ldx #$00
@restore_row:
    ldy #CORRIDOR_CENTRAL_FIRST
    lda CORRIDOR_BOUNDARY_LEFT,x
    sta (dst_ptr),y
    ldy #(CORRIDOR_CENTRAL_END-1)
    lda CORRIDOR_BOUNDARY_RIGHT,x
    sta (dst_ptr),y
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    inx
    cpx #CAPITAL_HULL_VISIBLE_ROWS
    bne @restore_row
    rts

; Reapply source-declared muzzles after the independent star stream restores
; boundary columns. Sector module lookup ensures non-combat rows never acquire
; a functional cannon even when they reuse combat armour primitives.
redraw_visible_muzzles:
    lda #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    sta dst_ptr+1
    lda #GAMEPLAY_FIRST_SCREEN_ROW
    sta row_counter
@muzzle_row:
    lda row_counter
    jsr visible_hull_sector_row
    bcs @advance
    tya
    pha
    jsr resolve_allied_sector_row
    bcs @enemy
    cmp #$08                    ; allied source cannon row
    bne @enemy
    ldy #CORRIDOR_CENTRAL_FIRST
    lda #CAPITAL_HULL_ALLIED_MUZZLE_CODE
    sta (dst_ptr),y
@enemy:
    pla
    cmp #CAPITAL_HULL_SIDE_PHASE_ROWS
    bcc @advance
    sec
    sbc #CAPITAL_HULL_SIDE_PHASE_ROWS
    jsr resolve_enemy_sector_row
    bcs @advance
    cmp #$0C                    ; enemy source cannon row
    bne @advance
    ldy #(CORRIDOR_CENTRAL_END-1)
    lda #CAPITAL_HULL_ENEMY_MUZZLE_CODE
    sta (dst_ptr),y
@advance:
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    inc row_counter
    lda row_counter
    cmp #(GAMEPLAY_FIRST_SCREEN_ROW+GAMEPLAY_SCREEN_ROWS)
    bne @muzzle_row
    rts

; A fired/reserved bit belongs to one source turret lifecycle. It is cleared
; only after that turret's real muzzle has left all 23 visible hull rows, so a
; later repeat of the 32-row segment may participate again.
reset_exited_turret_lifecycles:
    ldx #$00
@turret:
    stx BROAD_WORK_COUNT
    lda BROAD_TURRET_FIRED,x
    beq @next_turret
    lda turret_record_offsets,x
    tay
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET,y
    sta BROAD_WORK_VALUE
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    clc
    adc #<GAMEPLAY_SCREEN
    sta dst_ptr
    lda #>GAMEPLAY_SCREEN
    adc #$00
    sta dst_ptr+1
    lda #CAPITAL_HULL_VISIBLE_ROWS
    sta row_counter
@find_muzzle:
    ldy #$00
    lda (dst_ptr),y
    cmp BROAD_WORK_VALUE
    beq @next_turret
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @find_muzzle
    ldx BROAD_WORK_COUNT
    lda #$00
    sta BROAD_TURRET_FIRED,x
@next_turret:
    ldx BROAD_WORK_COUNT
    inx
    cpx #CAPITAL_HULL_TURRET_COUNT
    bne @turret
    rts

; Generates one bounded 8+24+8 row. Static hull maps also contain one declared
; projection cell at columns 8/31, used only for turret muzzles. Stars inspect
; those boundary cells and therefore cannot overwrite a muzzle. This combined
; path is used only for the initial 23 rows; visible scrolling uses the split
; world and hull routines above.
generate_corridor_row:
    lda #CH_SPACE
    ldy #CORRIDOR_CENTRAL_FIRST
@clear_central:
    sta (dst_ptr),y
    iny
    cpy #CORRIDOR_CENTRAL_END
    bne @clear_central

    jsr draw_hull_row
    jsr fill_starfield_empty_cells
    rts

; Generates a star-only centre row. Hull rows are deliberately not consulted:
; the two streams are independent and source-derived muzzles are overlaid later.
generate_starfield_row:
    lda #CH_SPACE
    ldy #$00
    ldx CAPITAL_SECTOR_STATE
    cpx #CAPITAL_HULL_STATE_COMPLETE
    beq @clear_central
    ldy #CORRIDOR_CENTRAL_FIRST
@clear_central:
    sta (dst_ptr),y
    iny
    cpx #CAPITAL_HULL_STATE_COMPLETE
    beq @full_limit
    cpy #CORRIDOR_CENTRAL_END
    bne @clear_central
    jmp generate_near_star_row
@full_limit:
    cpy #40
    bne @clear_central
    jmp generate_near_star_row

; Resolve a finite sector row to one reusable eight-row source module. The
; selected module id and local row remain in BROAD_WORK_VALUE/COUNT so the
; engine overlay can be applied without a second lookup.
resolve_allied_sector_row:
    cmp #CAPITAL_HULL_SECTOR_ROWS
    bcs @invalid
    sta loader_repeat_value
    and #(CAPITAL_HULL_SECTOR_MODULE_ROWS-1)
    sta BROAD_WORK_COUNT
    lda loader_repeat_value
    lsr
    lsr
    lsr
    tay
    lda allied_sector_sequence,y
    sta BROAD_WORK_VALUE
    asl
    asl
    asl
    clc
    adc BROAD_WORK_COUNT
    tay
    lda allied_sector_module_sources,y
    clc
    rts
@invalid:
    sec
    rts

resolve_enemy_sector_row:
    cmp #CAPITAL_HULL_SECTOR_ROWS
    bcs @invalid
    sta loader_repeat_value
    and #(CAPITAL_HULL_SECTOR_MODULE_ROWS-1)
    sta BROAD_WORK_COUNT
    lda loader_repeat_value
    lsr
    lsr
    lsr
    tay
    lda enemy_sector_sequence,y
    sta BROAD_WORK_VALUE
    asl
    asl
    asl
    clc
    adc BROAD_WORK_COUNT
    tay
    lda enemy_sector_module_sources,y
    clc
    rts
@invalid:
    sec
    rts

; A contains a source row in the compact 32x9 combat map.
set_allied_hull_source:
    sta loader_repeat_value
    asl
    asl
    asl
    clc
    adc loader_repeat_value
    sta src_ptr
    lda #$00
    adc #>CAPITAL_HULL_RUNTIME_ALLIED
    sta src_ptr+1
    rts

set_enemy_hull_source:
    sta loader_repeat_value
    asl
    asl
    asl
    clc
    adc loader_repeat_value
    sta src_ptr
    lda #$00
    adc #$00
    sta src_ptr+1
    clc
    lda src_ptr
    adc #<CAPITAL_HULL_RUNTIME_ENEMY
    sta src_ptr
    lda src_ptr+1
    adc #>CAPITAL_HULL_RUNTIME_ENEMY
    sta src_ptr+1
    rts

; The final 32 rows use compact one-byte occupancy profiles. Missing source
; cells are filled with faction mass, cleared cells remain genuine empty
; space, and the innermost occupied cell receives a partial-pixel edge glyph.
apply_allied_prow_profile:
    lda corridor_phase
    cmp #CAPITAL_HULL_SECTION_FORWARD_END
    bcc @done
    cmp #CAPITAL_HULL_SECTION_PROW_END
    bcs @done
    sec
    sbc #CAPITAL_HULL_SECTION_FORWARD_END
    tay
    lda allied_prow_occupancy_masks,y
    sta loader_repeat_value
    ldy #$00
@cell:
    lsr loader_repeat_value
    bcc @clear
    sty BROAD_WORK_COUNT          ; final stored value is the innermost cell
    lda (dst_ptr),y
    bne @next
    lda #CAPITAL_HULL_ALLIED_PROW_FILL_CODE
    sta (dst_ptr),y
    bne @next
@clear:
    lda #CH_SPACE
    sta (dst_ptr),y
@next:
    iny
    cpy #CORRIDOR_ALLIED_COLUMNS
    bne @cell
    ldy BROAD_WORK_COUNT
    lda #CAPITAL_HULL_ALLIED_PROW_EDGE_CODE
    sta (dst_ptr),y
@done:
    rts

apply_enemy_prow_profile:
    lda corridor_phase
    cmp #CAPITAL_HULL_SIDE_PHASE_ROWS
    bcc @done
    sec
    sbc #CAPITAL_HULL_SIDE_PHASE_ROWS
    cmp #CAPITAL_HULL_SECTION_FORWARD_END
    bcc @done
    cmp #CAPITAL_HULL_SECTION_PROW_END
    bcs @done
    sec
    sbc #CAPITAL_HULL_SECTION_FORWARD_END
    tay
    lda enemy_prow_occupancy_masks,y
    sta loader_repeat_value
    lda #$FF
    sta BROAD_WORK_COUNT
    ldy #CORRIDOR_ENEMY_FIRST
@cell:
    lsr loader_repeat_value
    bcc @clear
    lda BROAD_WORK_COUNT
    bpl :+
    sty BROAD_WORK_COUNT          ; first stored value is the innermost cell
:
    lda (dst_ptr),y
    bne @next
    lda #CAPITAL_HULL_ENEMY_PROW_FILL_CODE
    sta (dst_ptr),y
    bne @next
@clear:
    lda #CH_SPACE
    sta (dst_ptr),y
@next:
    iny
    cpy #40
    bne @cell
    ldy BROAD_WORK_COUNT
    lda #CAPITAL_HULL_ENEMY_PROW_EDGE_CODE
    sta (dst_ptr),y
@done:
    rts

; Draws the next finite sector row without advancing its shared longitudinal
; coordinate. The right ship uses a fixed eight-row content offset only.
draw_hull_row:
    lda corridor_phase
    jsr resolve_allied_sector_row
    bcs @blank_allied
    jsr set_allied_hull_source
    ldy #$00
@allied_hull:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #CAPITAL_HULL_MAP_COLUMNS
    bne @allied_hull
    jsr apply_allied_prow_profile
    lda BROAD_WORK_VALUE
    cmp #CAPITAL_HULL_ALLIED_ENGINE_MODULE
    bne @enemy
    ldy BROAD_WORK_COUNT
    lda allied_engine_overlay_masks,y
    sta loader_repeat_value
    ldy #$00
@allied_engine:
    lsr loader_repeat_value
    bcc :+
    lda #CAPITAL_HULL_ALLIED_ENGINE_CODE
    sta (dst_ptr),y
:
    iny
    cpy #CORRIDOR_ALLIED_COLUMNS
    bne @allied_engine
    jmp @enemy
@blank_allied:
    lda #CH_SPACE
    ldy #(CORRIDOR_ALLIED_COLUMNS-1)
@clear_allied:
    sta (dst_ptr),y
    dey
    bpl @clear_allied

@enemy:
    lda corridor_phase
    cmp #CAPITAL_HULL_SIDE_PHASE_ROWS
    bcc @blank_enemy
    sec
    sbc #CAPITAL_HULL_SIDE_PHASE_ROWS
    jsr resolve_enemy_sector_row
    bcs @blank_enemy
    jsr set_enemy_hull_source
    sec
    lda src_ptr
    sbc #31                       ; Y=31 addresses enemy runtime column zero
    sta src_ptr
    lda src_ptr+1
    sbc #$00
    sta src_ptr+1
    ldy #31
@enemy_hull:
    lda (src_ptr),y
    sta (dst_ptr),y
    iny
    cpy #40
    bne @enemy_hull
    jsr apply_enemy_prow_profile
    lda BROAD_WORK_VALUE
    cmp #CAPITAL_HULL_ENEMY_ENGINE_MODULE
    bne @done
    ldy BROAD_WORK_COUNT
    lda enemy_engine_overlay_masks,y
    sta loader_repeat_value
    ldy #CORRIDOR_ENEMY_FIRST
@enemy_engine:
    lsr loader_repeat_value
    bcc :+
    lda #CAPITAL_HULL_ENEMY_ENGINE_CODE
    sta (dst_ptr),y
:
    iny
    cpy #40
    bne @enemy_engine
    rts
@blank_enemy:
    lda #CH_SPACE
    ldy #39
@clear_enemy:
    sta (dst_ptr),y
    dey
    cpy #(CORRIDOR_ENEMY_FIRST-1)
    bne @clear_enemy
@done:
    rts

fill_starfield_empty_cells:
    jmp generate_near_star_row

; Initial rows preserve the historical RNG sequence: a hull projection stores
; black behind itself rather than leaking a capital-hull screen code into the
; independently scrolling star backing.
store_boundary_star:
    pha
    and #$7F
    cmp #CAPITAL_HULL_GLYPH_BASE
    pla
    bcc :+
    lda #CH_SPACE
:
    rts

.segment "CODE"

random_byte:
    lda rng_state
    lsr
    bcc :+
    eor #$B8
:
    sta rng_state
    rts

; -----------------------------------------------------------------------------
; POKEY sound

play_hit_sound:
    lda sound_enabled
    beq @done
    lda #$20
    sta AUDF2
    lda #$88
    sta AUDC2
    lda #$0E
    sta hit_timer
@done:
    rts

update_sound:
    lda sound_enabled
    bne @enabled
    jsr silence_audio
    jmp @damage
@enabled:
    lda fire_timer
    beq @hit
    dec fire_timer
    inc AUDF1
    lda fire_timer
    bne @hit
    lda #$00
    sta AUDC1

@hit:
    lda hit_timer
    beq @damage
    dec hit_timer
    inc AUDF2
    inc AUDF2
    lda hit_timer
    bne @capital
    lda #$00
    sta AUDC2

@capital:
    lda CAPITAL_EXPLOSION_SOUND_TIMER
    beq @capital_silent
    tax
    dex
    lda capital_explosion_sound_frequency,x
    sta AUDF4
    lda capital_explosion_sound_control,x
    sta AUDC4
    dec CAPITAL_EXPLOSION_SOUND_TIMER
    jmp @damage
@capital_silent:
    lda #$00
    sta AUDC4

@damage:
    lda damage_timer
    beq @normal_background
    dec damage_timer
    lda #$42
    sta COLBK
    rts
@normal_background:
    lda #$00
    sta COLBK
    rts

silence_audio:
    lda #$00
    sta AUDC1
    sta AUDC2
    sta AUDC3
    sta AUDC4
    sta AUDCTL
    sta CAPITAL_EXPLOSION_SOUND_TIMER
    rts

; -----------------------------------------------------------------------------
; Read-only data

.segment "RODATA"

hud_ascii:
    .byte "SCORE 00000  LIFE 3  HULL 100%"
    .byte $00

frontend_screen_data:
    .word main_menu_screen_data, options_screen_data, top_scores_screen_data
    .word exit_screen_data, ended_screen_data

raider_post_burst_frames:
    .byte RAIDER_POST_BURST_EASY,RAIDER_POST_BURST_MEDIUM,RAIDER_POST_BURST_HARD
viper_projectile_group_offsets:
    .byte 0,9,18,27
raider_projectile_group_offsets:
    .byte 0,10
viper_projectile_glyphs:
    EMIT_VIPER_PROJECTILE_GLYPHS
    .assert *-viper_projectile_glyphs = VIPER_PROJECTILE_GLYPH_COUNT*8, error, "Viper projectile glyph data changed"
shared_fighter_explosion_masks:
    EMIT_SHARED_FIGHTER_EXPLOSION_MASKS
shared_fighter_explosion_core_masks:
    EMIT_SHARED_FIGHTER_EXPLOSION_CORE_MASKS

.segment "RODATA"

player_shape:
    .byte %00011000
    .byte %00011000
    .byte %00111100
    .byte %01111110
    .byte %01111110
    .byte %11111111
    .byte %11111111
    .byte %11011011
    .byte %11111111
    .byte %11111111
    .byte %01111110
    .byte %00111100
    .byte %00100100
    .byte %01000010
    .byte %01000010
    .byte %00000000

player_engine_shape:
    .byte $00,$00,$00,$00
    .byte %00011000
    .byte %00011000
    .byte %00100100
    .byte %00100100
    .byte %00011000
    .byte %00011000
    .byte $00,$00
    .byte %00111100
    .byte %00011000
    .byte $00,$00

; ANTIC 4 character set. Each byte stores four two-bit pixels.
; Pixel values: 0=black, 1=white, 2=steel blue, 3=COLPF2 or COLPF3 when
; bit 7 of the screen code is set. The frontend sets COLPF3 to Kawasaki
; green; gameplay restores red before enabling DMA.
charset_data:
    ; 0: space
    .byte $00,$00,$00,$00,$00,$00,$00,$00
    ; 1-4: structural tiles; 5: HUD percent sign; 6-8: structural tiles
    .byte $AA,$AA,$AA,$AA,$AA,$AA,$AA,$AA
    .byte $A0,$80,$80,$80,$80,$80,$80,$A0
    .byte $AA,$82,$92,$82,$82,$92,$82,$AA
    .byte $82,$28,$28,$82,$82,$28,$28,$82
    .byte $CC,$D8,$18,$30,$60,$6C,$CC,$FF
    .byte $AA,$82,$82,$82,$82,$82,$82,$AA
    .byte $30,$30,$30,$30,$30,$30,$30,$30
    .byte $AA,$A8,$A8,$AA,$AA,$8A,$8A,$AA
    ; 9: HUD separator
    .byte $00,$00,$00,$00,$00,$00,$00,$AA
    ; 10: bright star
    .byte $00,$00,$10,$54,$10,$00,$00,$00
    ; 11: menu selection marker, 12: unused
    .byte $C0,$F0,$FC,$FF,$FC,$F0,$C0,$00
    .repeat 8
        .byte $00
    .endrepeat
    ; 13: dash, 14: dim star, 15: slash
    .byte $00,$00,$00,$55,$00,$00,$00,$00
    .byte $00,$00,$00,$00,$00,$10,$00,$00
    .byte $01,$01,$04,$04,$10,$10,$40,$40

    ; 16-25: amber digits 0-9
    .byte $3C,$C3,$C3,$C3,$C3,$C3,$3C,$00
    .byte $0C,$3C,$0C,$0C,$0C,$0C,$3F,$00
    .byte $3C,$C3,$03,$0C,$30,$C0,$FF,$00
    .byte $FC,$03,$03,$3C,$03,$03,$FC,$00
    .byte $0C,$3C,$CC,$FF,$0C,$0C,$0C,$00
    .byte $FF,$C0,$FC,$03,$03,$03,$FC,$00
    .byte $3C,$C0,$FC,$C3,$C3,$C3,$3C,$00
    .byte $FF,$03,$0C,$0C,$30,$30,$30,$00
    .byte $3C,$C3,$C3,$3C,$C3,$C3,$3C,$00
    .byte $3C,$C3,$C3,$3F,$03,$03,$3C,$00

    ; 26: colon, 27-30 unused, 31: question mark, 32 unused
    .byte $00,$10,$10,$00,$10,$10,$00,$00
    .repeat 32
        .byte $00
    .endrepeat
    .byte $14,$41,$01,$04,$04,$00,$04,$00
    .repeat 8
        .byte $00
    .endrepeat

    ; 33-58: white uppercase A-Z
    .byte $14,$41,$41,$55,$41,$41,$41,$00 ; A
    .byte $54,$41,$41,$54,$41,$41,$54,$00 ; B
    .byte $15,$40,$40,$40,$40,$40,$15,$00 ; C
    .byte $54,$41,$41,$41,$41,$41,$54,$00 ; D
    .byte $55,$40,$40,$54,$40,$40,$55,$00 ; E
    .byte $55,$40,$40,$54,$40,$40,$40,$00 ; F
    .byte $15,$40,$40,$45,$41,$41,$15,$00 ; G
    .byte $41,$41,$41,$55,$41,$41,$41,$00 ; H
    .byte $55,$04,$04,$04,$04,$04,$55,$00 ; I
    .byte $05,$01,$01,$01,$01,$41,$14,$00 ; J
    .byte $41,$44,$50,$40,$50,$44,$41,$00 ; K
    .byte $40,$40,$40,$40,$40,$40,$55,$00 ; L
    .byte $41,$55,$55,$41,$41,$41,$41,$00 ; M
    .byte $41,$51,$51,$45,$45,$41,$41,$00 ; N
    .byte $14,$41,$41,$41,$41,$41,$14,$00 ; O
    .byte $54,$41,$41,$54,$40,$40,$40,$00 ; P
    .byte $14,$41,$41,$41,$45,$44,$15,$00 ; Q
    .byte $54,$41,$41,$54,$44,$41,$41,$00 ; R
    .byte $15,$40,$40,$14,$01,$01,$54,$00 ; S
    .byte $55,$04,$04,$04,$04,$04,$04,$00 ; T
    .byte $41,$41,$41,$41,$41,$41,$14,$00 ; U
    .byte $41,$41,$41,$41,$41,$14,$04,$00 ; V
    .byte $41,$41,$41,$55,$55,$55,$41,$00 ; W
    .byte $41,$41,$14,$04,$14,$41,$41,$00 ; X
    .byte $41,$41,$14,$04,$04,$04,$04,$00 ; Y
    .byte $55,$01,$04,$04,$10,$40,$55,$00 ; Z

    .assert * - charset_data = CAPITAL_HULL_GLYPH_BASE*8, error, "capital hull glyph base changed"
capital_hull_glyphs:
    EMIT_CAPITAL_HULL_GLYPHS
capital_hull_glyphs_end:
    .assert capital_hull_glyphs_end - capital_hull_glyphs = CAPITAL_HULL_GLYPH_COUNT*8, error, "capital hull glyph count changed"

; The compact frontend glyph source still resides in unused gameplay charset
; bytes after the capital-hull allocation. Runtime expands it to $4800.
frontend_glyph_source:
frontend_glyph_rows:
    ; 1-10: digits 0-9
    .byte $78,$CC,$DC,$EC,$CC,$CC,$78
    .byte $30,$70,$30,$30,$30,$30,$FC
    .byte $78,$CC,$0C,$18,$30,$60,$FC
    .byte $F8,$0C,$0C,$78,$0C,$0C,$F8
    .byte $18,$38,$78,$D8,$FC,$18,$18
    .byte $FC,$C0,$F8,$0C,$0C,$CC,$78
    .byte $78,$C0,$C0,$F8,$CC,$CC,$78
    .byte $FC,$0C,$18,$30,$60,$60,$60
    .byte $78,$CC,$CC,$78,$CC,$CC,$78
    .byte $78,$CC,$CC,$7C,$0C,$0C,$78
    ; 11-36: clean 6x7 uppercase A-Z
    .byte $78,$CC,$CC,$FC,$CC,$CC,$CC ; A
    .byte $F8,$CC,$CC,$F8,$CC,$CC,$F8 ; B
    .byte $78,$CC,$C0,$C0,$C0,$CC,$78 ; C
    .byte $F8,$CC,$CC,$CC,$CC,$CC,$F8 ; D
    .byte $FC,$C0,$C0,$F8,$C0,$C0,$FC ; E
    .byte $FC,$C0,$C0,$F8,$C0,$C0,$C0 ; F
    .byte $78,$CC,$C0,$DC,$CC,$CC,$78 ; G
    .byte $CC,$CC,$CC,$FC,$CC,$CC,$CC ; H
    .byte $FC,$30,$30,$30,$30,$30,$FC ; I
    .byte $3C,$0C,$0C,$0C,$0C,$CC,$78 ; J
    .byte $CC,$D8,$F0,$E0,$F0,$D8,$CC ; K
    .byte $C0,$C0,$C0,$C0,$C0,$C0,$FC ; L
    .byte $CC,$FC,$FC,$DC,$CC,$CC,$CC ; M
    .byte $CC,$EC,$FC,$DC,$CC,$CC,$CC ; N
    .byte $78,$CC,$CC,$CC,$CC,$CC,$78 ; O
    .byte $F8,$CC,$CC,$F8,$C0,$C0,$C0 ; P
    .byte $78,$CC,$CC,$CC,$DC,$D8,$7C ; Q
    .byte $F8,$CC,$CC,$F8,$D8,$CC,$CC ; R
    .byte $7C,$C0,$C0,$78,$0C,$0C,$F8 ; S
    .byte $FC,$30,$30,$30,$30,$30,$30 ; T
    .byte $CC,$CC,$CC,$CC,$CC,$CC,$78 ; U
    .byte $CC,$CC,$CC,$CC,$CC,$78,$30 ; V
    .byte $CC,$CC,$CC,$DC,$FC,$FC,$CC ; W
    .byte $CC,$CC,$78,$30,$78,$CC,$CC ; X
    .byte $CC,$CC,$78,$30,$30,$30,$30 ; Y
    .byte $FC,$0C,$18,$30,$60,$C0,$FC ; Z
    ; 37-42: dash, dot, slash, colon, question, marker
    .byte $00,$00,$00,$FC,$00,$00,$00
    .byte $00,$00,$00,$00,$00,$00,$30
    .byte $0C,$18,$18,$30,$60,$60,$C0
    .byte $00,$30,$30,$00,$30,$30,$00
    .byte $78,$CC,$0C,$18,$30,$00,$30
    .byte $80,$C0,$60,$30,$60,$C0,$80
frontend_glyph_rows_end:

    .assert frontend_glyph_rows_end - frontend_glyph_rows = FRONTEND_GLYPH_COUNT*7, error, "frontend glyph source size changed"
    .repeat $400-(*-charset_data)
        .byte $00
    .endrepeat
charset_data_end:
    .assert charset_data_end - charset_data = $400, error, "gameplay charset image must remain 1024 bytes"

; Screen stream: screen address, zero-terminated ASCII; $FF ends a screen.
frontend_screen_records:
main_menu_screen_data:
    .word SCREEN+MAIN_MENU_TITLE_OFFSET+4
    .byte "DARK FIGHTER",0
    .word SCREEN+MAIN_MENU_OPTION_0_OFFSET+9
    .byte "START GAME",0
    .word SCREEN+MAIN_MENU_OPTION_1_OFFSET+9
    .byte "OPTIONS",0
    .word SCREEN+MAIN_MENU_OPTION_2_OFFSET+9
    .byte "TOP SCORES",0
    .word SCREEN+MAIN_MENU_OPTION_3_OFFSET+9
    .byte "EXIT",0
    .word SCREEN+MAIN_MENU_HINT_OFFSET+7
    .byte "UP/DOWN MOVE  FIRE SELECT",0
    .byte $FF

options_screen_data:
    .word SCREEN+4*40+16
    .byte "OPTIONS",0
    .word SCREEN+10*40+14
    .byte "SOUND: OFF",0
    .word SCREEN+13*40+11
    .byte "DIFFICULTY: MEDIUM",0
    .word SCREEN+16*40+18
    .byte "BACK",0
    .byte $FF

top_scores_screen_data:
    .word SCREEN+2*40+15
    .byte "TOP SCORES",0
    .word SCREEN+21*40+16
    .byte "FIRE BACK",0
    .byte $FF

exit_screen_data:
    .word SCREEN+7*40+15
    .byte "EXIT GAME?",0
    .word SCREEN+13*40+14
    .byte "NO",0
    .word SCREEN+13*40+23
    .byte "YES",0
    .byte $FF

ended_screen_data:
    .word SCREEN+9*40+11
    .byte "DARK FIGHTER ENDED",0
    .word SCREEN+13*40+9
    .byte "PRESS RESET TO RESTART",0
    .byte $FF

; Main-menu ANTIC 6 rows, then ANTIC 2 options and exit choices.
frontend_marker_positions:
    .word SCREEN+MAIN_MENU_OPTION_0_OFFSET+7
    .word SCREEN+MAIN_MENU_OPTION_1_OFFSET+7
    .word SCREEN+MAIN_MENU_OPTION_2_OFFSET+7
    .word SCREEN+MAIN_MENU_OPTION_3_OFFSET+7
    .word SCREEN+10*40+12, SCREEN+13*40+9, SCREEN+16*40+16
    .word SCREEN+13*40+12, SCREEN+13*40+21

frontend_screen_records_end:
    .assert frontend_screen_records_end - frontend_screen_records = 255, error, "frontend screen data size changed"

; Packed 32-row maps are expanded once to $4C00-$4E3F. Metadata remains
; resident and is the contract for broadside firing/collision in stage 2.
enemy_hull_packed_map:
    EMIT_ENEMY_HULL_PACKED_MAP

; Immutable PMG masks belong with the main read-only data. Keeping these six
; bytes out of the relocation block leaves the HUD formatter inside the fixed
; BROADSIDE_RAM boundary without consuming the protected finale arena.
missile_masks:
    .byte $0C,$30,$C0
missile_clear_masks:
    .byte $F3,$CF,$3F
missile_double_size_bits:
    .byte $04,$10,$40
missile_quad_size_bits:
    .byte $0C,$30,$C0

.segment "BROADSIDE"

; This segment is loaded transiently at $4000 and copied to $5E10 before the
; loader bitmap is unpacked. Runtime labels therefore use their reclaimed-RAM
; addresses while XEX and ATR remain one consecutive boot payload.
allied_hull_packed_map:
    EMIT_ALLIED_HULL_PACKED_MAP
allied_hull_codebook:
    EMIT_ALLIED_HULL_CODEBOOK
enemy_hull_codebook:
    EMIT_ENEMY_HULL_CODEBOOK
capital_hull_turrets:
    EMIT_CAPITAL_HULL_TURRETS
capital_hull_turrets_end:
    .assert capital_hull_turrets_end - capital_hull_turrets = CAPITAL_HULL_TURRET_COUNT*CAPITAL_HULL_TURRET_RECORD_BYTES, error, "capital hull turret metadata changed"
broadside_schedule:
    EMIT_BROADSIDE_SCHEDULE
world_scroll_rates:
    EMIT_WORLD_SCROLL_RATES
hull_scroll_rates:
    EMIT_HULL_SCROLL_RATES
allied_collision_boundaries:
    EMIT_ALLIED_COLLISION_BOUNDARIES
enemy_collision_boundaries:
    EMIT_ENEMY_COLLISION_BOUNDARIES
allied_sector_module_sources:
    EMIT_ALLIED_SECTOR_MODULE_SOURCES
enemy_sector_module_sources:
    EMIT_ENEMY_SECTOR_MODULE_SOURCES
allied_sector_sequence:
    EMIT_ALLIED_SECTOR_SEQUENCE
enemy_sector_sequence:
    EMIT_ENEMY_SECTOR_SEQUENCE
allied_engine_overlay_masks:
    EMIT_ALLIED_ENGINE_OVERLAY_MASKS
enemy_engine_overlay_masks:
    EMIT_ENEMY_ENGINE_OVERLAY_MASKS
allied_prow_occupancy_masks:
    EMIT_ALLIED_PROW_OCCUPANCY_MASKS
enemy_prow_occupancy_masks:
    EMIT_ENEMY_PROW_OCCUPANCY_MASKS
allied_prow_collision_boundaries:
    EMIT_ALLIED_PROW_COLLISION_BOUNDARIES
enemy_prow_collision_boundaries:
    EMIT_ENEMY_PROW_COLLISION_BOUNDARIES
engine_animation_frames:
    EMIT_ENGINE_ANIMATION_FRAMES
capital_explosion_phases:
    EMIT_CAPITAL_EXPLOSION_PHASES
capital_explosion_sound_frequency:
    EMIT_CAPITAL_EXPLOSION_SOUND_FREQUENCY
capital_explosion_sound_control:
    EMIT_CAPITAL_EXPLOSION_SOUND_CONTROL
capital_explosion_phase_offsets:
    .byte 0,9,18,27,36,45
explosion_backup_offsets:
    .byte 0,9

turret_record_offsets:
    .byte $00,$07
turret_warning_last_safe_rows:
    EMIT_TURRET_WARNING_LAST_SAFE_ROWS
top_score_row_template:
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_SPACE,CH_FRONT_SPACE
    .byte CH_FRONT_DASH,CH_FRONT_DASH,CH_FRONT_DASH,CH_FRONT_SPACE,CH_FRONT_SPACE
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_ZERO
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_ZERO
difficulty_value_table:
    .byte CH_FRONT_A+4,CH_FRONT_A,CH_FRONT_A+18,CH_FRONT_A+24,CH_FRONT_SPACE,CH_FRONT_SPACE
    .byte CH_FRONT_A+12,CH_FRONT_A+4,CH_FRONT_A+3,CH_FRONT_A+8,CH_FRONT_A+20,CH_FRONT_A+12
    .byte CH_FRONT_A+7,CH_FRONT_A,CH_FRONT_A+17,CH_FRONT_A+3,CH_FRONT_SPACE,CH_FRONT_SPACE

init_broadside:
    lda #$00
    ldx #(BROAD_STATE_END-BROAD_STATE_BASE)-1
@clear_state:
    sta BROAD_STATE_BASE,x
    dex
    bpl @clear_state
    ldx #(CAPITAL_HULL_TURRET_COUNT-1)
@clear_turrets:
    sta BROAD_TURRET_FIRED,x
    dex
    bpl @clear_turrets
    ldx #(BROADSIDE_SLOT_COUNT-1)
@clear_flash:
    sta BROAD_FLASH_TIMER,x
    dex
    bpl @clear_flash
    sta CAPITAL_SECTOR_DRAIN_ROWS
    sta PLAYER_CONTACT_ROWS
    sta PLAYER_CONTACT_LEFT
    sta PLAYER_CONTACT_RIGHT
    sta RESPAWN_INVULNERABLE_TIMER
    sta RESPAWN_BLINK_FRAME
    ldx #(ENEMY_ARCHETYPE-CAPITAL_EXPLOSION_TIMER)-1
@clear_explosion_state:
    sta CAPITAL_EXPLOSION_TIMER,x
    dex
    bpl @clear_explosion_state
    lda #PLAYER_ALIVE
    sta PLAYER_LIFECYCLE
    lda #PLAYER_STARTING_LIVES
    sta PLAYER_LIVES
    lda #CAPITAL_HULL_STATE_ENGINES
    sta CAPITAL_SECTOR_STATE
    lda #PLAYER_HEALTH_UNITS    ; ten 10-point units, directly deriving 100%
    sta BROAD_PLAYER_HEALTH
    lda #BROADSIDE_INITIAL_DELAY
    sta BROAD_SCHEDULE_TIMER
    lda #CAPITAL_HULL_ENGINE_ANIMATION_FRAMES
    sta ENGINE_ANIMATION_TIMER
    lda #$00
    sta ENGINE_ANIMATION_PHASE
    jsr copy_engine_animation_phase
    lda SIZEM
    and #$03                    ; preserve M0 size pair
    ora #BROADSIDE_DOUBLE_SIZES
    sta SIZEM
    rts

.segment "BROADSIDE"
update_player_death:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    beq @dying
    cmp #PLAYER_GAME_OVER
    beq @finished
    clc
    rts
@dying:
    dec BROAD_DEATH_TIMER
    lda BROAD_DEATH_TIMER
    beq @finished
    clc
    rts
@finished:
    lda PLAYER_LIVES
    beq @game_over
    jsr respawn_player
    clc
    rts
@game_over:
    lda #PLAYER_GAME_OVER
    sta PLAYER_LIFECYCLE
    jsr clear_player_collision_latches
    sec
    rts

respawn_player:
    jsr erase_player
    jsr clear_fighter_projectiles
    lda #PLAYER_RESPAWN_X
    sta player_x
    sta HPOSP0
    sta HPOSP3
    lda #PLAYER_RESPAWN_Y
    sta player_y
    lda #PLAYER_HEALTH_UNITS
    sta BROAD_PLAYER_HEALTH
    lda #$00
    sta BROAD_DEATH_TIMER
    sta BROAD_DAMAGE_COOLDOWN
    sta BROAD_DAMAGE_APPLIED
    sta damage_timer
    sta RESPAWN_BLINK_FRAME
    jsr update_hud_status
    jsr clear_player_collision_latches
    lda #RESPAWN_INVULNERABLE_FRAMES
    sta RESPAWN_INVULNERABLE_TIMER
    lda #PLAYER_RESPAWN_INVULNERABLE
    sta PLAYER_LIFECYCLE
    jsr draw_player
    rts

tick_respawn_invulnerability:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_RESPAWN_INVULNERABLE
    bne @done
    inc RESPAWN_BLINK_FRAME
    dec RESPAWN_INVULNERABLE_TIMER
    bne @done
    jsr clear_player_collision_latches
    jsr erase_player
    jsr draw_player
    lda #PLAYER_ALIVE
    sta PLAYER_LIFECYCLE
@done:
    rts

clear_player_collision_latches:
    lda #$00
    sta BROAD_M0_COLLISION
    sta BROAD_P0_COLLISION
    sta BROAD_DAMAGE_APPLIED
    sta HITCLR
    rts

.segment "BROADSIDE"

update_broadside:
    lda #$00
    sta BROAD_LAUNCH_USED
    lda BROAD_DAMAGE_COOLDOWN
    beq :+
    dec BROAD_DAMAGE_COOLDOWN
:
    ldx #$00
@slot:
    jsr erase_broadside_slot
    lda BROAD_STATE,x
    bne :+
    jmp @next
:
    cmp #BROAD_WARNING
    beq @warning
    cmp #BROAD_FLYING
    beq @flying
    jmp @impact

@warning:
    lda BROAD_TIMER,x
    beq @launch
    dec BROAD_TIMER,x
    bne @draw_warning
@launch:
    lda BROAD_LAUNCH_USED
    bne @draw_warning
    lda #$01
    sta BROAD_LAUNCH_USED
    lda #BROAD_FLYING
    sta BROAD_STATE,x
    jsr set_broadside_slot_double
    lda #CAPITAL_HULL_LAUNCH_FLASH_FRAMES
    sta BROAD_FLASH_TIMER,x
    jmp @next
@draw_warning:
    jsr render_broadside_warning
    jmp @next

@flying:
    lda BROAD_OWNER,x
    bne @move_left
    lda BROAD_X,x
    clc
    adc #BROADSIDE_PROJECTILE_SPEED
    sta BROAD_X,x
    jmp @targets
@move_left:
    lda BROAD_X,x
    sec
    sbc #BROADSIDE_PROJECTILE_SPEED
    sta BROAD_X,x
@targets:
    jsr capital_shell_collision_flags
    lda BROAD_COLLISION,x
    and #$02                    ; first target is the ordinary Cylon fighter
    beq @player_target
    jsr begin_broadside_impact
    lda BROAD_OWNER,x
    eor #$01
    ora #DAMAGE_CAPITAL_CYLON
    tay
    lda #CAPITAL_DAMAGE_UNITS
    jsr queue_enemy_damage
    jmp @next
@player_target:
    lda BROAD_COLLISION,x
    and #$01                    ; Cylon shell reaches the Viper first
    beq @hull
    jsr begin_broadside_impact
    jsr apply_broadside_player_damage
    jmp @next
@hull:
    jsr broadside_hits_opposite_hull
    bcc @offscreen
    jsr count_broadside_hull_hit
    jsr begin_capital_hull_explosion
    jsr play_capital_explosion_sound
    jsr begin_broadside_impact
    jmp @next
@offscreen:
    lda BROAD_X,x
    cmp #48
    bcc @free
    cmp #208
    bcs @free
    jmp @next
@free:
    jsr free_broadside_slot
    jmp @next

@impact:
    dec BROAD_TIMER,x
    beq @free
    lda BROAD_TIMER,x
    and #$01                    ; bounded blink reuses the same missile slot
    beq @next
    lda #BROADSIDE_IMPACT_HEIGHT
    jsr draw_broadside_span
@next:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    beq :+
    jmp @slot
:
    jsr schedule_broadside
@done:
    rts

schedule_broadside:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bcc :+
    rts
:
    dec BROAD_SCHEDULE_TIMER
    beq :+
    rts
:
    ldx #$00
@free_slot:
    lda BROAD_STATE,x
    beq @have_slot
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @free_slot
    jmp @retry
@have_slot:
    stx BROAD_WORK_SLOT
    lda BROAD_SCHEDULE_INDEX
    asl
    tay
    lda broadside_schedule,y
    ldx BROAD_WORK_SLOT
    sta BROAD_OWNER,x            ; schedule records a side, not a fixed cannon
    lda #$FF
    sta BROAD_TURRET,x           ; no eligible candidate yet
    lda #$00
    sta BROAD_Y,x                ; oldest candidate screen row
    ldy DIFFICULTY_SETTING
    lda turret_warning_last_safe_rows,y
    sta BROAD_TIMER,x
    lda #$00
    sta BROAD_WORK_COUNT         ; candidate turret index

@candidate:
    ldx BROAD_WORK_COUNT
    lda BROAD_TURRET_FIRED,x
    beq :+
    jmp @next_candidate
:
    lda turret_record_offsets,x
    sta BROAD_WORK_VALUE
    tay
    lda capital_hull_turrets+CAPITAL_TURRET_SIDE_OFFSET,y
    ldx BROAD_WORK_SLOT
    cmp BROAD_OWNER,x
    beq :+
    jmp @next_candidate
:

    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET,y
    sta loader_repeat_value
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    clc
    adc #<(GAMEPLAY_SCREEN+40)
    sta dst_ptr
    lda #>(GAMEPLAY_SCREEN+40)
    adc #$00
    sta dst_ptr+1
    lda #(GAMEPLAY_FIRST_SCREEN_ROW+1)
    sta row_counter
    ldy #$00
@visible:
    lda (dst_ptr),y
    cmp loader_repeat_value
    beq @visible_row
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    inc row_counter
    lda row_counter
    ldx BROAD_WORK_SLOT
    cmp BROAD_TIMER,x
    bcc @visible
    beq @visible
    bne @next_candidate
@visible_row:
    lda row_counter
    asl
    asl
    asl
    clc
    adc #BROADSIDE_SCREEN_TOP
    ldx BROAD_WORK_SLOT
    ldy BROAD_WORK_VALUE
    adc capital_hull_turrets+CAPITAL_TURRET_SCANLINE_OFFSET,y
    sta BROAD_X,x                ; temporary candidate centre scanline

    ldy #$00
@separation:
    cpy BROAD_WORK_SLOT
    beq @separation_next
    lda BROAD_STATE,y
    beq @separation_next
    lda BROAD_Y,y
    sec
    sbc BROAD_X,x
    bcs :+
    eor #$FF
    clc
    adc #$01
:
    cmp #BROADSIDE_MIN_VERTICAL_SEPARATION
    bcc @next_candidate
@separation_next:
    iny
    cpy #BROADSIDE_SLOT_COUNT
    bne @separation

    ; Oldest means the greatest visible row: closest to leaving the safe region.
    ldx BROAD_WORK_SLOT
    lda BROAD_Y,x
    cmp row_counter
    bcs @next_candidate
    lda row_counter
    sta BROAD_Y,x
    lda BROAD_WORK_COUNT
    sta BROAD_TURRET,x
    ldy BROAD_WORK_VALUE
    lda dst_ptr
    sec
    sbc capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    sta BROAD_ROW_LO,x
    lda dst_ptr+1
    sbc #$00
    sta BROAD_ROW_HI,x

@next_candidate:
    inc BROAD_WORK_COUNT
    lda BROAD_WORK_COUNT
    cmp #CAPITAL_HULL_TURRET_COUNT
    beq :+
    jmp @candidate
:

    ldx BROAD_WORK_SLOT
    lda BROAD_TURRET,x
    cmp #$FF
    beq @retry
    tay
    lda turret_record_offsets,y
    sta BROAD_WORK_VALUE
    tay
    lda BROAD_Y,x
    asl
    asl
    asl
    clc
    adc #BROADSIDE_SCREEN_TOP
    adc capital_hull_turrets+CAPITAL_TURRET_SCANLINE_OFFSET,y
    sta BROAD_Y,x

    lda capital_hull_turrets+CAPITAL_TURRET_SIDE_OFFSET,y
    sta BROAD_OWNER,x
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    asl
    asl
    clc
    adc #48
    ldy BROAD_OWNER,x
    bne :+
    clc
    adc #$04                    ; allied tip launches beyond column 8
:
    sta BROAD_X,x
    lda #BROADSIDE_WARNING_FRAMES
    sta BROAD_TIMER,x
    lda #BROAD_WARNING
    sta BROAD_STATE,x
    ldy BROAD_TURRET,x
    lda #$01
    sta BROAD_TURRET_FIRED,y
    jsr render_broadside_warning

    lda BROAD_SCHEDULE_INDEX
    asl
    tay
    lda broadside_schedule+1,y
    sta BROAD_SCHEDULE_TIMER
    inc BROAD_SCHEDULE_INDEX
    lda BROAD_SCHEDULE_INDEX
    cmp #BROADSIDE_SCHEDULE_COUNT
    bcc @done
    lda #$00
    sta BROAD_SCHEDULE_INDEX
@done:
    rts
@retry:
    lda #BROADSIDE_RETRY_DELAY
    sta BROAD_SCHEDULE_TIMER
    rts

render_broadside_warning:
    lda BROAD_TIMER,x
    cmp #(BROADSIDE_WARNING_FRAMES-BROADSIDE_WARNING_EARLY_FRAMES+1)
    bcc @not_early
    jsr set_broadside_slot_normal
    lda BROAD_X,x
    ldy BROAD_OWNER,x
    beq @early_positioned
    clc
    adc #$01                    ; keep enemy charge's right edge on its path
@early_positioned:
    sta HPOSM1,x
    lda #BROADSIDE_WARNING_EARLY_HEIGHT
    jmp draw_broadside_span_at_hpos
@not_early:
    cmp #(BROADSIDE_WARNING_FRAMES-BROADSIDE_WARNING_EARLY_FRAMES-BROADSIDE_WARNING_MEDIUM_FRAMES+1)
    bcc @hot
@double:
    jsr set_broadside_slot_double
    lda BROAD_X,x
    sta HPOSM1,x
    lda #BROADSIDE_WARNING_MEDIUM_HEIGHT
    jmp draw_broadside_span_at_hpos
@hot:
    sec
    sbc #$01
    lsr                           ; two-frame pulse groups, never PAL flicker
    and #$01
    beq @hot_double
    jsr set_broadside_slot_quad
    lda BROAD_X,x
    ldy BROAD_OWNER,x
    beq @hot_positioned
    sec
    sbc #$02                    ; quad enemy charge grows left into corridor
@hot_positioned:
    sta HPOSM1,x
    lda #BROADSIDE_WARNING_HEIGHT
    jmp draw_broadside_span_at_hpos
@hot_double:
    jsr set_broadside_slot_double
    lda BROAD_X,x
    sta HPOSM1,x
    lda #BROADSIDE_WARNING_HEIGHT
    jmp draw_broadside_span_at_hpos

scroll_broadside_scene:
    ldx #$00
@warning:
    lda BROAD_STATE,x
    cmp #BROAD_WARNING
    bne @next
    jsr erase_broadside_slot
    lda BROAD_Y,x
    clc
    adc #$08
    sta BROAD_Y,x
    cmp #(BROADSIDE_WARNING_Y_MAX+1)
    bcc :+
    jsr free_broadside_slot
    jmp @next
:
    clc
    lda BROAD_ROW_LO,x
    adc #40
    sta BROAD_ROW_LO,x
    bcc :+
    inc BROAD_ROW_HI,x
:
    jsr render_broadside_warning
@next:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @warning
    ldx #$00
@flash:
    lda BROAD_FLASH_TIMER,x
    beq @next_flash
    clc
    lda BROAD_ROW_LO,x
    adc #40
    sta BROAD_ROW_LO,x
    bcc @next_flash
    inc BROAD_ROW_HI,x
@next_flash:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @flash
    ldx #$00
@explosion:
    lda CAPITAL_EXPLOSION_TIMER,x
    beq @next_explosion
    clc
    lda CAPITAL_EXPLOSION_ROW_LO,x
    adc #40
    sta CAPITAL_EXPLOSION_ROW_LO,x
    bcc :+
    inc CAPITAL_EXPLOSION_ROW_HI,x
:
    lda CAPITAL_EXPLOSION_ROW_HI,x
    cmp #>GAMEPLAY_SCREEN_END
    bcc @next_explosion
    bne @expire_explosion
    lda CAPITAL_EXPLOSION_ROW_LO,x
    cmp #<GAMEPLAY_SCREEN_END
    bcc @next_explosion
@expire_explosion:
    lda #$00
    sta CAPITAL_EXPLOSION_TIMER,x
@next_explosion:
    inx
    cpx #$02
    bne @explosion
    rts

; Launch flashes use a temporary character at the real muzzle cell. They are
; visual only: collision continues to come from the underlying source module.
; Timers are advanced before projectile updates, so a value of four is visible
; on the launch frame and the following three complete PAL frames.
tick_launch_flashes:
    ldx #$00
@slot:
    lda BROAD_FLASH_TIMER,x
    beq @next
    dec BROAD_FLASH_TIMER,x
    bne @next
    jsr restore_launch_flash_cell
@next:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @slot
    rts

render_launch_flashes:
    ldx #$00
@slot:
    lda BROAD_FLASH_TIMER,x
    beq @next
    stx BROAD_WORK_SLOT
    lda BROAD_ROW_LO,x
    sta dst_ptr
    lda BROAD_ROW_HI,x
    sta dst_ptr+1
    ldy BROAD_TURRET,x
    lda turret_record_offsets,y
    tay
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    sta BROAD_WORK_VALUE
    lda capital_hull_turrets+CAPITAL_TURRET_SIDE_OFFSET,y
    beq @allied
    lda #CAPITAL_HULL_ENEMY_FLASH_CODE
    bne @draw
@allied:
    lda #CAPITAL_HULL_ALLIED_FLASH_CODE
@draw:
    ldy BROAD_WORK_VALUE
    sta (dst_ptr),y
    ldx BROAD_WORK_SLOT
@next:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @slot
    rts

restore_launch_flash_cell:
    stx BROAD_WORK_SLOT
    lda BROAD_ROW_LO,x
    sta dst_ptr
    lda BROAD_ROW_HI,x
    sta dst_ptr+1
    ldy BROAD_TURRET,x
    lda turret_record_offsets,y
    tay
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_COLUMN_OFFSET,y
    sta BROAD_WORK_VALUE
    lda capital_hull_turrets+CAPITAL_TURRET_MUZZLE_SCREEN_CODE_OFFSET,y
    ldy BROAD_WORK_VALUE
    sta (dst_ptr),y
    ldx BROAD_WORK_SLOT
    rts

; Both engine banks share one bounded three-phase timer. Only their two
; dedicated charset glyphs change; PMG, palette, collision, and display-list
; state remain untouched.
update_engine_animation:
    dec ENGINE_ANIMATION_TIMER
    bne @done
    lda #CAPITAL_HULL_ENGINE_ANIMATION_FRAMES
    sta ENGINE_ANIMATION_TIMER
    inc ENGINE_ANIMATION_PHASE
    lda ENGINE_ANIMATION_PHASE
    cmp #CAPITAL_HULL_ENGINE_ANIMATION_PHASES
    bcc :+
    lda #$00
    sta ENGINE_ANIMATION_PHASE
:
    jsr copy_engine_animation_phase
@done:
    rts

copy_engine_animation_phase:
    lda ENGINE_ANIMATION_PHASE
    asl
    asl
    asl
    tay
    ldx #$00
@byte:
    lda engine_animation_frames,y
    sta CHARSET+CAPITAL_HULL_ALLIED_ENGINE_GLYPH*8,x
    lda engine_animation_frames+24,y
    sta CHARSET+CAPITAL_HULL_ENEMY_ENGINE_GLYPH*8,x
    iny
    inx
    cpx #$08
    bne @byte
    rts

update_sector_completion:
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bne @done
    lda CAPITAL_SECTOR_DRAIN_ROWS
    cmp #CAPITAL_HULL_VISIBLE_ROWS
    bcc @done
    ldx #$00
@active:
    lda BROAD_STATE,x
    bne @done
    lda BROAD_FLASH_TIMER,x
    bne @done
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @active
    lda CAPITAL_EXPLOSION_TIMER
    ora CAPITAL_EXPLOSION_TIMER+1
    bne @done
    lda FIGHTER_EXPLOSION_TIMER
    ora FIGHTER_EXPLOSION_TIMER+1
    bne @done
    lda #CAPITAL_HULL_STATE_COMPLETE
    sta CAPITAL_SECTOR_STATE
    ; Fighter fire remains ordinary gameplay state in ACTIVE, DRAIN and
    ; COMPLETE. Collision, expiry, death/respawn, and actual gameplay teardown
    ; own projectile release; a sector phase cannot reset the burst controller.
@done:
    rts

apply_broadside_player_damage:
    lda #CAPITAL_DAMAGE_UNITS

; A is damage in ten-point units. Capital shells and hull contact pass two;
; the ordinary Raider pulse passes one. Every damage source retains the same
; lifecycle, cooldown, one-event-per-frame, death and respawn gate.
apply_player_damage:
    sta BROAD_WORK_VALUE
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_ALIVE
    bne @done
    lda BROAD_DAMAGE_COOLDOWN
    bne @done
    lda BROAD_DAMAGE_APPLIED
    bne @done
    lda #$01
    sta BROAD_DAMAGE_APPLIED
    lda #BROADSIDE_DAMAGE_COOLDOWN
    sta BROAD_DAMAGE_COOLDOWN
    lda BROAD_PLAYER_HEALTH
    beq @done
    sec
    sbc BROAD_WORK_VALUE
    bcs :+
    lda #$00
:
    sta BROAD_PLAYER_HEALTH
    lda #$12
    sta damage_timer
    jsr play_hit_sound
    lda BROAD_PLAYER_HEALTH
    bne @update_hud
    lda #PLAYER_DYING
    sta PLAYER_LIFECYCLE
    lda PLAYER_LIVES
    beq :+
    dec PLAYER_LIVES
:
    lda #SHARED_FIGHTER_EXPLOSION_TOTAL
    sta BROAD_DEATH_TIMER
    jsr erase_bullet
    jsr clear_raider_pulses
    jsr begin_player_fighter_explosion
@update_hud:
    jmp update_hud_status
@done:
    rts

.segment "BROADSIDE"
; Only three dynamic HUD characters are touched: one LIFE digit and the
; changing hundreds/tens positions of HULL. The percent sign and trailing
; zero are static template characters because canonical health is stored in
; exact ten-percent units. Values below 100 use a blank hundreds cell rather
; than an ambiguous leading zero.
update_hud_status:
    lda PLAYER_LIVES
    ora #CH_ZERO
    sta SCREEN+HUD_LIFE_DIGIT_OFFSET

    lda BROAD_PLAYER_HEALTH
    cmp #PLAYER_HEALTH_UNITS
    bcc @under_one_hundred
    lda #CH_ZERO
    sta SCREEN+HUD_HULL_TENS_OFFSET
    lda #CH_ZERO+1
    sta SCREEN+HUD_HULL_HUNDREDS_OFFSET
    rts
@under_one_hundred:
    tax
    lda #CH_SPACE
    sta SCREEN+HUD_HULL_HUNDREDS_OFFSET
    txa
    beq @store_tens
    ora #CH_ZERO
@store_tens:
    sta SCREEN+HUD_HULL_TENS_OFFSET
    rts

.segment "BROADSIDE"

begin_broadside_impact:
    lda #BROAD_IMPACT
    sta BROAD_STATE,x
    lda #BROADSIDE_IMPACT_FRAMES
    sta BROAD_TIMER,x
    jsr set_broadside_slot_double
    lda #BROADSIDE_IMPACT_HEIGHT
    jmp draw_broadside_span

count_broadside_hull_hit:
    lda BROAD_OWNER,x
    bne @allied_hull
    lda BROAD_ENEMY_HITS
    cmp #$FF
    beq @done
    inc BROAD_ENEMY_HITS
    rts
@allied_hull:
    lda BROAD_ALLIED_HITS
    cmp #$FF
    beq @done
    inc BROAD_ALLIED_HITS
@done:
    rts

; One bounded 3x3 character overlay per target hull. The projectile row pointer
; selects the impact row; each active overlay then receives the same +40-byte
; step as its parent hull. The source collision boundaries remain authoritative.
begin_capital_hull_explosion:
    stx BROAD_WORK_SLOT
    lda BROAD_OWNER,x
    beq @target_enemy
    ldx #$00                    ; enemy fire impacts the allied hull
    lda BROAD_WORK_VALUE
    sec
    sbc #48
    lsr
    lsr
    sec
    sbc #CAPITAL_EXPLOSION_WIDTH
    bcs :+
    lda #$00
:
    cmp #(CORRIDOR_ALLIED_COLUMNS-CAPITAL_EXPLOSION_WIDTH+1)
    bcc @store_column
    lda #(CORRIDOR_ALLIED_COLUMNS-CAPITAL_EXPLOSION_WIDTH)
    bne @store_column
@target_enemy:
    ldx #$01                    ; allied fire impacts the enemy hull
    lda BROAD_WORK_VALUE
    sec
    sbc #48
    lsr
    lsr
    cmp #CORRIDOR_ENEMY_FIRST
    bcs :+
    lda #CORRIDOR_ENEMY_FIRST
:
    cmp #(40-CAPITAL_EXPLOSION_WIDTH+1)
    bcc @store_column
    lda #(40-CAPITAL_EXPLOSION_WIDTH)
@store_column:
    sta CAPITAL_EXPLOSION_COLUMN,x
    ldy BROAD_WORK_SLOT
    sec
    lda BROAD_ROW_LO,y
    sbc #40
    sta CAPITAL_EXPLOSION_ROW_LO,x
    lda BROAD_ROW_HI,y
    sbc #$00
    sta CAPITAL_EXPLOSION_ROW_HI,x
    lda #CAPITAL_EXPLOSION_DURATION
    sta CAPITAL_EXPLOSION_TIMER,x
    ldx BROAD_WORK_SLOT
    rts

play_capital_explosion_sound:
    lda sound_enabled
    beq @done
    lda #CAPITAL_EXPLOSION_SOUND_AUDCTL
    sta AUDCTL
    lda #CAPITAL_EXPLOSION_DURATION
    sta CAPITAL_EXPLOSION_SOUND_TIMER
@done:
    rts

; Previous character backing is restored before any hull row movement or
; module animation is applied. This prevents stale pixels and makes recapture
; reflect launch flashes and the current engine animation phase exactly.
tick_capital_explosions:
    ldx #$00
@effect:
    lda CAPITAL_EXPLOSION_TIMER,x
    beq @next
    jsr restore_capital_explosion
    ldx BROAD_WORK_SLOT
    dec CAPITAL_EXPLOSION_TIMER,x
@next:
    inx
    cpx #$02
    bne @effect
    rts

restore_capital_explosions:
    ldx #$00
@effect:
    lda CAPITAL_EXPLOSION_TIMER,x
    beq @next
    jsr restore_capital_explosion
    ldx BROAD_WORK_SLOT
@next:
    inx
    cpx #$02
    bne @effect
    rts

restore_capital_explosion:
    stx BROAD_WORK_SLOT
    lda CAPITAL_EXPLOSION_ROW_LO,x
    sta dst_ptr
    lda CAPITAL_EXPLOSION_ROW_HI,x
    sta dst_ptr+1
    lda CAPITAL_EXPLOSION_COLUMN,x
    sta PLAYER_CONTACT_LEFT
    lda explosion_backup_offsets,x
    sta BROAD_WORK_VALUE
    lda #CAPITAL_EXPLOSION_HEIGHT
    sta row_counter
@row:
    lda #CAPITAL_EXPLOSION_WIDTH
    sta PLAYER_CONTACT_ROWS
    ldy PLAYER_CONTACT_LEFT
@cell:
    ldx BROAD_WORK_VALUE
    lda CAPITAL_EXPLOSION_BACKUP,x
    sta (dst_ptr),y
    inc BROAD_WORK_VALUE
    iny
    dec PLAYER_CONTACT_ROWS
    bne @cell
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @row
    ldx BROAD_WORK_SLOT
    rts

render_capital_explosions:
    ldx #$00
@effect:
    lda CAPITAL_EXPLOSION_TIMER,x
    beq @next
    jsr render_capital_explosion
    ldx BROAD_WORK_SLOT
@next:
    inx
    cpx #$02
    bne @effect
    rts

render_capital_explosion:
    stx BROAD_WORK_SLOT
    lda CAPITAL_EXPLOSION_ROW_LO,x
    sta dst_ptr
    lda CAPITAL_EXPLOSION_ROW_HI,x
    sta dst_ptr+1
    lda CAPITAL_EXPLOSION_COLUMN,x
    sta PLAYER_CONTACT_LEFT
    lda explosion_backup_offsets,x
    sta BROAD_WORK_VALUE
    lda #CAPITAL_EXPLOSION_DURATION
    sec
    sbc CAPITAL_EXPLOSION_TIMER,x
    lsr
    lsr                           ; four PAL frames per visual phase
    tay
    lda capital_explosion_phase_offsets,y
    sta PLAYER_CONTACT_RIGHT
    lda #CAPITAL_EXPLOSION_HEIGHT
    sta row_counter
@row:
    lda #CAPITAL_EXPLOSION_WIDTH
    sta PLAYER_CONTACT_ROWS
    ldy PLAYER_CONTACT_LEFT
@cell:
    lda (dst_ptr),y
    ldx BROAD_WORK_VALUE
    sta CAPITAL_EXPLOSION_BACKUP,x
    and #$7F
    cmp #CAPITAL_HULL_GLYPH_BASE
    bcc @skip
    cmp #(CAPITAL_HULL_GLYPH_BASE+CAPITAL_HULL_GLYPH_COUNT)
    bcs @skip
    ldx PLAYER_CONTACT_RIGHT
    lda capital_explosion_phases,x
    beq @skip
    sta (dst_ptr),y
@skip:
    inc BROAD_WORK_VALUE
    inc PLAYER_CONTACT_RIGHT
    iny
    dec PLAYER_CONTACT_ROWS
    bne @cell
    clc
    lda dst_ptr
    adc #40
    sta dst_ptr
    bcc :+
    inc dst_ptr+1
:
    dec row_counter
    bne @row
    ldx BROAD_WORK_SLOT
    rts

; Returns one spatially first target flag in BROAD_COLLISION,x: bit 0 Viper,
; bit 1 Cylon fighter. The swept rectangle includes the previous and current
; positions and the full eight-HPOS by six-scanline visible playfield slug.
capital_shell_collision_flags:
    stx BROAD_WORK_SLOT
    lda BROAD_X,x
    sta src_ptr                  ; swept left edge
    clc
    adc #(CAPITAL_PROJECTILE_WIDTH_HPOS-1)
    sta src_ptr+1                ; swept right edge (inclusive)
    lda BROAD_OWNER,x
    beq @allied_sweep
    lda src_ptr+1
    clc
    adc #BROADSIDE_PROJECTILE_SPEED
    sta src_ptr+1                ; enemy moved left: old right lies two beyond
    jsr capital_shell_hits_enemy
    bcc @enemy_player_only
    jsr capital_shell_hits_player
    bcc @fighter_first
    ; For a left-moving shell, the target with the greatest right edge is hit
    ; first. Equal edges deterministically credit the fighter.
    ldy ENEMY_ARCHETYPE
    lda enemy_x
    clc
    adc enemy_visible_widths,y
    sta row_counter
    lda player_x
    clc
    adc #PLAYER_COLLISION_WIDTH
    cmp row_counter
    bcc @fighter_result
    beq @fighter_result
    lda #$01
    bne @store_result
@fighter_result:
@fighter_first:
    lda #$02
    bne @store_result
@enemy_player_only:
    jsr capital_shell_hits_player
    bcc @zero_result
    lda #$01
    bne @store_result
@allied_sweep:
    lda src_ptr
    sec
    sbc #BROADSIDE_PROJECTILE_SPEED
    sta src_ptr                  ; allied moved right: old left lies two before
    jsr capital_shell_hits_enemy
    bcc @zero_result
    lda #$02
    bne @store_result
@zero_result:
    lda #$00
@store_result:
    ldx BROAD_WORK_SLOT
    sta BROAD_COLLISION,x
    rts

; Target helpers expand the target vertically by the shell half-height, then
; share four exclusive rectangle comparisons. src_ptr contains shell L/R;
; dst_ptr target L/R; frontend_data_ptr expanded target T/B.
capital_shell_hits_target:
    lda src_ptr+1
    cmp dst_ptr
    bcc @miss
    lda dst_ptr+1
    cmp src_ptr
    bcc @miss
    ldx BROAD_WORK_SLOT
    lda BROAD_Y,x
    cmp frontend_data_ptr
    bcc @miss
    cmp frontend_data_ptr+1
    bcs @miss
    sec
    rts
@miss:
    clc
    rts

capital_shell_hits_enemy:
    lda ENEMY_ACTIVE
    cmp #ENEMY_ACTIVE_STATE
    bne @miss
    lda enemy_x
    sta dst_ptr
    ldy ENEMY_ARCHETYPE
    clc
    adc enemy_visible_widths,y
    sec
    sbc #$01
    sta dst_ptr+1
    lda enemy_y
    sec
    sbc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    sta frontend_data_ptr
    clc
    lda frontend_data_ptr
    adc enemy_frame_heights,y
    adc #CAPITAL_PROJECTILE_VISIBLE_HEIGHT
    sta frontend_data_ptr+1
    jmp capital_shell_hits_target
@miss:
    clc
    rts

capital_shell_hits_player:
    lda player_x
    sta dst_ptr
    clc
    adc #(PLAYER_COLLISION_WIDTH-1)
    sta dst_ptr+1
    lda player_y
    sec
    sbc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    sta frontend_data_ptr
    clc
    lda frontend_data_ptr
    adc #(PLAYER_COLLISION_LAST_ROW+1+CAPITAL_PROJECTILE_VISIBLE_HEIGHT)
    sta frontend_data_ptr+1
    jmp capital_shell_hits_target

; Keep this label adjacent to the shared test so disassembly and tests can
; prove that both factions use archetype envelopes rather than GTIA colour.
.if 0
capital_shell_overlaps_enemy_obsolete:
    ldx ENEMY_ARCHETYPE
    lda enemy_x
    clc
    adc enemy_visible_widths,x
    cmp BROAD_WORK_VALUE
    bcc @miss
    beq @miss
    ldx BROAD_WORK_SLOT
    lda BROAD_Y,x
    clc
    adc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    cmp enemy_y
    bcc @miss
    beq @miss
    lda enemy_y
    ldx ENEMY_ARCHETYPE
    clc
    adc enemy_frame_heights,x
    ldx BROAD_WORK_SLOT
    sta row_counter
    lda BROAD_Y,x
    sec
    sbc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    cmp row_counter
    bcs @miss
    sec
    rts
@miss:
    ldx BROAD_WORK_SLOT
    clc
    rts
capital_shell_overlaps_player_obsolete:
    ldx BROAD_WORK_SLOT
    lda BROAD_OWNER,x
    cmp #OWNER_ENEMY
    bne @miss
    lda BROAD_WORK_COUNT
    cmp player_x
    bcc @miss
    beq @miss
    lda player_x
    clc
    adc #PLAYER_COLLISION_WIDTH
    cmp BROAD_WORK_VALUE
    bcc @miss
    beq @miss
    lda BROAD_Y,x
    clc
    adc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    cmp player_y
    bcc @miss
    beq @miss
    lda player_y
    clc
    adc #(PLAYER_COLLISION_LAST_ROW+1)
    sta row_counter
    lda BROAD_Y,x
    sec
    sbc #(CAPITAL_PROJECTILE_VISIBLE_HEIGHT/2)
    cmp row_counter
    bcs @miss
    sec
    rts
@miss:
    ldx BROAD_WORK_SLOT
    clc
    rts
.endif

broadside_hits_opposite_hull:
    stx BROAD_WORK_SLOT
    lda BROAD_Y,x
    sec
    sbc #BROADSIDE_SCREEN_TOP
    bcc @miss
    lsr
    lsr
    lsr
    cmp #(GAMEPLAY_FIRST_SCREEN_ROW+GAMEPLAY_SCREEN_ROWS)
    bcs @miss
    ldx BROAD_WORK_SLOT
    lda BROAD_ROW_LO,x
    sta src_ptr
    lda BROAD_ROW_HI,x
    sta src_ptr+1
    lda BROAD_OWNER,x
    bne @target_allied
    ldy #31
@enemy_edge:
    lda (src_ptr),y
    and #$7F
    cmp #CAPITAL_HULL_GLYPH_BASE
    bcc @enemy_next
    bcs @enemy_found
@enemy_next:
    iny
    cpy #40
    bne @enemy_edge
    beq @miss
@enemy_found:
    tya
    asl
    asl
    clc
    adc #48
    sta BROAD_WORK_VALUE
    lda BROAD_X,x
    clc
    adc #CAPITAL_PROJECTILE_WIDTH_HPOS
    cmp BROAD_WORK_VALUE
    bcs @hit
    bcc @miss

@target_allied:
    ldy #$08
@allied_edge:
    lda (src_ptr),y
    and #$7F
    cmp #CAPITAL_HULL_GLYPH_BASE
    bcc @allied_next
    bcs @allied_found
@allied_next:
    dey
    bpl @allied_edge
    bmi @miss
@allied_found:
    iny
    tya
    asl
    asl
    clc
    adc #48
    sta BROAD_WORK_VALUE
    lda BROAD_X,x
    cmp BROAD_WORK_VALUE
    bcc @hit
    beq @hit
@miss:
    ldx BROAD_WORK_SLOT
    clc
    rts
@hit:
    ldx BROAD_WORK_SLOT
    sec
    rts

; Converts a visible gameplay row to the shared finite left-ship sector row.
; Carry is set for the initial approach or final drained blank rows.
visible_hull_sector_row:
    sec
    sbc #GAMEPLAY_FIRST_SCREEN_ROW
    sta loader_repeat_value
    lda CAPITAL_SECTOR_STATE
    cmp #CAPITAL_HULL_STATE_DRAIN
    bcs @draining
    lda loader_repeat_value
    cmp BROAD_VISIBLE_SCROLLS
    bcs @invalid
    lda corridor_phase
    sec
    sbc #$01
    sec
    sbc loader_repeat_value
    tay
    clc
    rts
@draining:
    lda loader_repeat_value
    cmp CAPITAL_SECTOR_DRAIN_ROWS
    bcc @invalid
    sec
    sbc CAPITAL_SECTOR_DRAIN_ROWS
    sta loader_repeat_value
    lda #(CAPITAL_HULL_STREAM_ROWS-1)
    sec
    sbc loader_repeat_value
    tay
    clc
    rts
@invalid:
    sec
    rts

; P0 and P3 share player_x. At most three visible finite-sector rows are
; resolved through their reusable modules. Stars are ignored because only the
; module-derived base collision boundaries participate.
handle_player_hull_contact:
    lda PLAYER_LIFECYCLE
    cmp #PLAYER_DYING
    bne :+
    rts
:
    cmp #PLAYER_GAME_OVER
    bne :+
    rts
:
    lda player_y
    sec
    sbc #BROADSIDE_SCREEN_TOP
    lsr
    lsr
    lsr
    sta row_counter
    lda player_y
    clc
    adc #PLAYER_COLLISION_LAST_ROW
    sec
    sbc #BROADSIDE_SCREEN_TOP
    lsr
    lsr
    lsr
    sec
    sbc row_counter
    clc
    adc #$01
    sta PLAYER_CONTACT_ROWS
    lda #PLAYER_X_MIN
    sta PLAYER_CONTACT_LEFT       ; greatest allied safe boundary
    lda #208
    sta PLAYER_CONTACT_RIGHT      ; smallest enemy safe boundary
@row:
    lda row_counter
    jsr visible_hull_sector_row
    bcs @next_row
    tya
    pha
    cmp #CAPITAL_HULL_SECTION_FORWARD_END
    bcc @allied_module
    cmp #CAPITAL_HULL_SECTION_PROW_END
    bcs @enemy_row
    sec
    sbc #CAPITAL_HULL_SECTION_FORWARD_END
    tay
    lda allied_prow_collision_boundaries,y
    jmp @allied_boundary
@allied_module:
    jsr resolve_allied_sector_row
    bcs @enemy_row
    tay
    lda allied_collision_boundaries,y
@allied_boundary:
    cmp PLAYER_CONTACT_LEFT
    bcc :+
    sta PLAYER_CONTACT_LEFT
:
@enemy_row:
    pla
    cmp #CAPITAL_HULL_SIDE_PHASE_ROWS
    bcc @next_row
    sec
    sbc #CAPITAL_HULL_SIDE_PHASE_ROWS
    cmp #CAPITAL_HULL_SECTION_FORWARD_END
    bcc @enemy_module
    cmp #CAPITAL_HULL_SECTION_PROW_END
    bcs @next_row
    sec
    sbc #CAPITAL_HULL_SECTION_FORWARD_END
    tay
    lda enemy_prow_collision_boundaries,y
    jmp @enemy_boundary
@enemy_module:
    jsr resolve_enemy_sector_row
    bcs @next_row
    tay
    lda enemy_collision_boundaries,y
@enemy_boundary:
    cmp PLAYER_CONTACT_RIGHT
    bcs :+
    sta PLAYER_CONTACT_RIGHT
:
@next_row:
    inc row_counter
    dec PLAYER_CONTACT_ROWS
    bne @row

    lda player_x
    cmp PLAYER_CONTACT_LEFT
    bcc @allied_contact
    clc
    adc #(PLAYER_COLLISION_WIDTH-1)
    cmp PLAYER_CONTACT_RIGHT
    bcs @enemy_contact
@done:
    rts
@allied_contact:
    lda PLAYER_CONTACT_LEFT
    bne @clamp
@enemy_contact:
    lda PLAYER_CONTACT_RIGHT
    sec
    sbc #PLAYER_COLLISION_WIDTH
@clamp:
    sta player_x
    sta HPOSP0
    sta HPOSP3
    ldx #$00
    jmp apply_broadside_player_damage

free_broadside_slot:
    jsr erase_broadside_slot
    lda #BROAD_FREE
    sta BROAD_STATE,x
    sta BROAD_TIMER,x
    sta HPOSM1,x
    rts

erase_broadside_slot:
    stx BROAD_WORK_SLOT
    lda BROAD_PREV_H,x
    beq @done
    lda BROAD_STATE,x
    cmp #BROAD_FLYING
    bne @missile_span
    lda BROAD_ROW_LO,x
    sta dst_ptr
    lda BROAD_ROW_HI,x
    sta dst_ptr+1
    lda BROAD_PREV_H,x           ; stored as previous column + 1
    sec
    sbc #$01
    tay
    lda BROAD_PREV_Y,x
    sta (dst_ptr),y
    iny
    lda BROAD_COLLISION,x
    sta (dst_ptr),y
    lda #$00
    sta BROAD_PREV_H,x
    rts
@missile_span:
    lda BROAD_PREV_H,x
    sta BROAD_WORK_COUNT
    ldy BROAD_PREV_Y,x
@line:
    ldx BROAD_WORK_SLOT
    lda MISSILES,y
    and missile_clear_masks,x
    sta MISSILES,y
    iny
    dec BROAD_WORK_COUNT
    bne @line
    lda #$00
    sta BROAD_PREV_H,x
@done:
    ldx BROAD_WORK_SLOT
    rts

; Capital shells are two-cell ANTIC 4 overlays using fixed runtime glyphs.
; Their amber/crimson bodies avoid every COLPM coupling while preserving
; P0-P3, M0, the Raider body/scanner, and simultaneous enemy capacity.
.segment "CODE"
render_capital_shell_overlays:
    ldx #$00
@capital:
    lda BROAD_STATE,x
    cmp #BROAD_FLYING
    bne @next
    jsr render_capital_shell_overlay
@next:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @capital
    rts

.segment "BROADSIDE"
render_capital_shell_overlay:
    lda BROAD_ROW_LO,x
    sta dst_ptr
    lda BROAD_ROW_HI,x
    sta dst_ptr+1
    lda BROAD_X,x
    sec
    sbc #48
    lsr
    lsr
    tay
    tya
    clc
    adc #$01
    sta BROAD_PREV_H,x           ; nonzero previous screen column token
    lda (dst_ptr),y
    sta BROAD_PREV_Y,x
    iny
    lda (dst_ptr),y
    sta BROAD_COLLISION,x        ; second backing byte; GTIA snapshots are unused
    dey
    lda frame_counter
    lsr
    and #$01
    clc
    adc #CAPITAL_SHELL_PHASE0
    pha
    lda BROAD_OWNER,x
    beq @colonial
    pla
    ora #CAPITAL_PROJECTILE_CYLON_ATTRIBUTE
    bne @draw
@colonial:
    pla
@draw:
    sta (dst_ptr),y
    iny
    sta (dst_ptr),y
    rts


draw_broadside_span:
    pha
    lda BROAD_X,x
    sta HPOSM1,x
    pla
draw_broadside_span_at_hpos:
    stx BROAD_WORK_SLOT
    sta BROAD_WORK_COUNT
    sta BROAD_PREV_H,x
    lsr
    sta BROAD_WORK_VALUE
    lda BROAD_Y,x
    sec
    sbc BROAD_WORK_VALUE         ; BROAD_Y is the warned shell centreline
    sta BROAD_PREV_Y,x
    tay
    lda missile_masks,x
    sta BROAD_WORK_VALUE
@line:
    lda MISSILES,y
    ora BROAD_WORK_VALUE
    sta MISSILES,y
    iny
    dec BROAD_WORK_COUNT
    bne @line
    ldx BROAD_WORK_SLOT
    rts

.segment "CODE"
set_broadside_slot_normal:
    lda SIZEM
    and missile_clear_masks,x
    sta SIZEM
    rts

set_broadside_slot_double:
    lda SIZEM
    and missile_clear_masks,x
    ora missile_double_size_bits,x
    sta SIZEM
    rts

.segment "BROADSIDE"
set_broadside_slot_quad:
    lda SIZEM
    and missile_clear_masks,x
    ora missile_quad_size_bits,x
    sta SIZEM
    rts

enemy_frame_heights:
    EMIT_ENEMY_FRAME_HEIGHTS
enemy_size_modes:
    EMIT_ENEMY_SIZE_MODES
enemy_visible_left_insets:
    EMIT_ENEMY_VISIBLE_LEFT_INSETS
enemy_visible_widths:
    EMIT_ENEMY_VISIBLE_WIDTHS
enemy_logical_x_maxs:
    EMIT_ENEMY_LOGICAL_X_MAXS
enemy_accent_rows:
    EMIT_ENEMY_ACCENT_ROWS
enemy_accent_offsets:
    EMIT_ENEMY_ACCENT_OFFSETS
.segment "CODE"
enemy_hit_points:
    EMIT_ENEMY_HIT_POINTS
enemy_scores:
    EMIT_ENEMY_SCORES
.segment "BROADSIDE"
enemy_weapon_profiles:
    EMIT_ENEMY_WEAPON_PROFILES
enemy_projectile_spawn_y_offsets:
    EMIT_ENEMY_PROJECTILE_SPAWN_Y_OFFSETS
enemy_body_data:
    EMIT_ENEMY_BODY_DATA
enemy_accent_data:
    EMIT_ENEMY_ACCENT_DATA
enemy_runtime_data_end:

.assert enemy_runtime_data_end - enemy_frame_heights = 84, error, "enemy roster broadside tables changed"
.assert * - __BROADSIDE_RUN__ <= $1600, error, "broadside runtime exceeds relocation block"

.segment "RODATA"

; Main menu: one 16-scanline ANTIC 7 title plus twenty-two 8-scanline rows.
; Cumulative screen offsets are documented by MAIN_MENU_*_OFFSET constants.
main_menu_display_list:
    .byte $70,$70,$70
    .byte $47,<SCREEN,>SCREEN      ; ANTIC 7 title, 20 B
    .byte $04,$04,$04             ; upper ANTIC 4 hangar, 40 B each
    .byte $06                     ; START GAME, 20 B
    .byte $04                     ; ANTIC 4 bay, 40 B
    .byte $06                     ; OPTIONS, 20 B
    .byte $04                     ; ANTIC 4 scene, 40 B
    .byte $06                     ; TOP SCORES, 20 B
    .byte $04                     ; ANTIC 4 scene, 40 B
    .byte $06                     ; EXIT, 20 B
    .repeat 9
        .byte $04                 ; lower ANTIC 4 scene, 40 B
    .endrepeat
    .byte $84                     ; divider + DLI before neutral hint palette
    .byte $02                     ; 40-column ANTIC 2 control hint
    .byte $04                     ; black breathing-space row
main_menu_display_list_jvb:
    .byte $41
    .word main_menu_display_list

; Text-heavy sub-screens use the same readable 1-bit frontend charset.
frontend_text_display_list:
    .byte $70,$70,$70
    .byte $42,<SCREEN,>SCREEN      ; ANTIC 2 + LMS
    .repeat 23
        .byte $02
    .endrepeat
    .byte $41
    .word frontend_text_display_list

; One compact ANTIC 2 HUD row shares its empty eighth scanline with the raster
; separator. Its DLI installs the gameplay charset/palette before 23 ANTIC 4
; corridor rows; the final-row DLI restores the HUD font for the next PAL frame.
display_list:
    .byte $C2,<SCREEN,>SCREEN      ; ANTIC 2 HUD + LMS + DLI
    .repeat 22
        .byte $04
    .endrepeat
    .byte $84                      ; final ANTIC 4 row + DLI
display_list_jvb:
    .byte $41,<display_list,>display_list

    .assert MAIN_MENU_SCREEN_BYTES <= $400, error, "main-menu screen data exceeds shared buffer"

.include "loader-screen.inc"
