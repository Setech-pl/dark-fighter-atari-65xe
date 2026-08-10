.setcpu "6502"

; Dark Fighter 0.1 vertical slice
; Target: stock Atari 65XE PAL, 64 KB

.export start
.export boot_return
.import __BROADSIDE_LOAD__, __BROADSIDE_RUN__

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
CORRIDOR_BOUNDARY_LEFT      = HULL_SCROLL_ACCUMULATOR+$01 ; 22 B star backing
CORRIDOR_BOUNDARY_RIGHT     = CORRIDOR_BOUNDARY_LEFT+$16  ; 22 B star backing
BROAD_TURRET_FIRED          = CORRIDOR_BOUNDARY_RIGHT+$16 ; source turret count
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
GAMEPLAY_RESIDENT_END       = ENGINE_ANIMATION_PHASE+$01

BROAD_FREE    = 0
BROAD_WARNING = 1
BROAD_FLYING  = 2
BROAD_IMPACT  = 3
PLAYER_ALIVE                = 0
PLAYER_DYING                = 1
PLAYER_RESPAWN_INVULNERABLE = 2
PLAYER_GAME_OVER            = 3
OWNER_ALLIED  = 0
OWNER_ENEMY   = 1
DIFFICULTY_EASY   = 0
DIFFICULTY_MEDIUM = 1
DIFFICULTY_HARD   = 2
DIFFICULTY_DEFAULT = DIFFICULTY_MEDIUM

MISSILE_M0_MASK = $03
MISSILE_M0_CLEAR_MASK = $FC
BROADSIDE_DOUBLE_SIZES = $54
BROADSIDE_WARNING_Y_MAX = 215
BROADSIDE_SCREEN_TOP = 32
BROADSIDE_PLAYFIELD_TOP = 48
BROADSIDE_SLOT_COUNT = 3

PLAYER_H    = 16
PLAYER_COLLISION_WIDTH = 8
PLAYER_COLLISION_LAST_ROW = 14
ENEMY_H     = 12
PLAYER_X_MIN = 48
PLAYER_X_MAX = 200
PLAYER_Y_MIN = 64
PLAYER_Y_MAX = 208

; Atari screen-code values for the OS character set.
CH_SPACE    = 0
CH_PANEL_SOLID = 1
CH_PANEL_EDGE = 2
CH_PANEL_RIVET = 3
CH_PANEL_TRUSS = 4
CH_PANEL_DAMAGE = 5
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

KAWASAKI_GREEN = $D8
GAMEPLAY_COLPF0 = $0E
GAMEPLAY_COLPF1 = $84
GAMEPLAY_COLPF2 = $28
GAMEPLAY_COLPF3 = $44
HUD_COLPF1 = $0E
HUD_COLPF2 = $00

.include "capital-hulls.inc"

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
PLAYER_RESPAWN_Y = $B8
ENEMY_VISIBLE_WIDTH = 16
ENEMY_X_MIN = CORRIDOR_LEFT_HPOS
ENEMY_X_MAX = CORRIDOR_RIGHT_HPOS-ENEMY_VISIBLE_WIDTH
ENEMY_X_RANGE = ENEMY_X_MAX-ENEMY_X_MIN
ENEMY_SPAWN_X = ENEMY_X_MIN+ENEMY_X_RANGE/2

.assert BROAD_STATE_END <= $4E80, error, "broadside resident state exceeds 64 bytes"
.assert GAMEPLAY_RESIDENT_END <= $4F00, error, "gameplay resident state exceeds reclaimed RAM"
.assert PLAYER_RESPAWN_X = 124, error, "player respawn must center the eight-HPOS envelope in the 24-column corridor"
.assert ENEMY_X_MIN = 80, error, "enemy left edge must begin at the central corridor"
.assert ENEMY_X_MAX = 160, error, "double-width enemy must end before the enemy hull"
.assert ENEMY_X_MAX+ENEMY_VISIBLE_WIDTH = CORRIDOR_RIGHT_HPOS, error, "enemy envelope must fit the corridor exactly"
.assert RESPAWN_INVULNERABLE_FRAMES = 250, error, "respawn invulnerability must be exactly five PAL seconds"
.assert RESPAWN_BLINK_HALF_PERIOD_FRAMES = 8, error, "respawn blink must toggle every eight PAL frames"
.assert BROADSIDE_WARNING_PULSE_FRAMES = 2, error, "warning pulse routine requires two-frame groups"
.assert CAPITAL_HULL_CONTACT_DAMAGE = BROADSIDE_PLAYER_DAMAGE, error, "contact damage must use shared 20-point path"
.assert CAPITAL_HULL_CONTACT_COOLDOWN = BROADSIDE_DAMAGE_COOLDOWN, error, "contact cooldown must use shared damage gate"

.segment "ZEROPAGE"

player_x:           .res 1
player_y:           .res 1
enemy_x:            .res 1
enemy_y:            .res 1
enemy_direction:    .res 1
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

    sta game_state                 ; STATE_LOADER
    jsr unpack_loader_bitmap
    jsr show_loader

    ; Rebuild the gameplay and mixed-mode frontend displays with DMA off.
    ; This also reclaims loader-only payload bytes before Player 2 PMG data.
    jsr clear_pmg
    jsr copy_charset
    jsr copy_frontend_charset
    jsr copy_hud_charset
    jsr clear_screen

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
    lda #$0C                    ; pale enemy hull
    sta COLPM1
    lda #$46                    ; hostile red scanner
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
    jsr enter_main_menu
    jmp frontend_loop

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
    rts

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
    lda player_x
    sta HPOSP0
    sta HPOSP3
    jsr draw_player
    jsr draw_enemy
    jsr update_score_display
    jsr update_life_display
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
    jsr update_bullet
@simulation:
    jsr update_enemy
    lda #$00
    sta BROAD_DAMAGE_APPLIED
    jsr handle_collisions
    jsr update_starfield
    jsr handle_player_hull_contact
    jsr render_launch_flashes
    jsr render_capital_explosions
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

; PackBits commands: 1..127 literal bytes, $81..$FF repeated byte counts,
; and $00 terminator. The host compiler verifies an exact 7680-byte expansion.
unpack_loader_bitmap:
    lda #<loader_bitmap_packbits
    sta src_ptr
    lda #>loader_bitmap_packbits
    sta src_ptr+1
    lda #<LOADER_BITMAP_ADDRESS
    sta dst_ptr
    lda #>LOADER_BITMAP_ADDRESS
    sta dst_ptr+1

@command:
    ldy #$00
    lda (src_ptr),y
    beq @done
    tax
    jsr loader_advance_src
    txa
    bmi @repeat

@literal:
    ldy #$00
    lda (src_ptr),y
    sta (dst_ptr),y
    jsr loader_advance_src
    jsr loader_advance_dst
    dex
    bne @literal
    jmp @command

@repeat:
    and #$7F
    tax
    ldy #$00
    lda (src_ptr),y
    sta loader_repeat_value
    jsr loader_advance_src
@repeat_byte:
    ldy #$00
    lda loader_repeat_value
    sta (dst_ptr),y
    jsr loader_advance_dst
    dex
    bne @repeat_byte
    jmp @command

@done:
    rts

loader_advance_src:
    inc src_ptr
    bne :+
    inc src_ptr+1
:
    rts

loader_advance_dst:
    inc dst_ptr
    bne :+
    inc dst_ptr+1
:
    rts

init_state:
    lda #PLAYER_RESPAWN_X
    sta player_x
    lda #PLAYER_RESPAWN_Y
    sta player_y

    lda #ENEMY_SPAWN_X
    sta enemy_x
    lda #$38
    sta enemy_y

    lda #$01
    sta enemy_direction
    lda #$A7
    sta rng_state

    lda #$00
    sta bullet_active
    sta scanner_phase
    sta frame_counter
    sta fire_timer
    sta hit_timer
    sta damage_timer
    sta score_bcd_lo
    sta score_bcd_hi
    lda #$00                    ; finite flagship sector begins before its prows
    sta corridor_phase

    lda #$00
    sta scroll_accumulator
    sta HULL_SCROLL_ACCUMULATOR
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

    lda #$FF                    ; dedicated full-width divider glyph
    sta HUD_CHARSET+CH_SEPARATOR*8+7
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

; The DLI at the end of the second HUD row prepares ANTIC 4 before its first
; visible scanline. The DLI on the final gameplay row restores the HUD font
; and neutral monochrome palette during the following blank region. A is the
; only modified register and is preserved; X and Y remain untouched.
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
    lda #CH_SEPARATOR
    ldx #39
@divider:
    sta SCREEN+40,x
    dex
    bpl @divider

    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    lda #22
    sta row_counter
    lda #$00
    sta BROAD_WORK_COUNT
@corridor_rows:
    jsr generate_starfield_row  ; hull rows enter from the top at half world speed
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
    lda TRIG0
    bne @done
    lda bullet_active
    bne @done
    jsr fire_bullet
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

fire_bullet:
    lda player_x
    clc
    adc #$08
    sta bullet_x
    sta HPOSM0
    lda player_y
    sec
    sbc #$04
    sta bullet_y
    ldy bullet_y
    lda MISSILES,y
    and #MISSILE_M0_CLEAR_MASK
    ora #MISSILE_M0_MASK
    sta MISSILES,y
    lda #$01
    sta bullet_active

    lda sound_enabled
    beq @done
    lda #$32
    sta AUDF1
    lda #$A8
    sta AUDC1
    lda #$07
    sta fire_timer
@done:
    rts

update_bullet:
    lda bullet_active
    beq @done

    ldy bullet_y
    lda MISSILES,y
    and #MISSILE_M0_CLEAR_MASK
    sta MISSILES,y

    lda bullet_y
    cmp #$28
    bcc @deactivate
    sec
    sbc #$04
    sta bullet_y
    tay
    lda MISSILES,y
    and #MISSILE_M0_CLEAR_MASK
    ora #MISSILE_M0_MASK
    sta MISSILES,y
    rts

@deactivate:
    lda #$00
    sta bullet_active
@done:
    rts

erase_bullet:
    lda bullet_active
    beq @done
    ldy bullet_y
    lda MISSILES,y
    and #MISSILE_M0_CLEAR_MASK
    sta MISSILES,y
    lda #$00
    sta bullet_active
@done:
    rts

; -----------------------------------------------------------------------------
; Enemy

update_enemy:
    jsr erase_enemy

    inc enemy_y
    lda enemy_y
    cmp #$E0
    bcc @horizontal
    jsr reset_enemy
    jmp draw_enemy

@horizontal:
    lda frame_counter
    and #$03
    bne @scanner

    lda enemy_direction
    beq @move_left
@move_right:
    lda enemy_x
    cmp #ENEMY_X_MAX
    bcs @turn_left
    inc enemy_x
    jmp @scanner
@turn_left:
    lda #ENEMY_X_MAX
    sta enemy_x
    lda #$00
    sta enemy_direction
    jmp @scanner
@move_left:
    lda enemy_x
    cmp #ENEMY_X_MIN
    bcc @turn_right
    beq @turn_right
    dec enemy_x
    jmp @scanner
@turn_right:
    lda #ENEMY_X_MIN
    sta enemy_x
    lda #$01
    sta enemy_direction

@scanner:
    inc scanner_phase
    lda scanner_phase
    and #$0F
    sta scanner_phase

draw_enemy:
    jsr clamp_enemy_x
    lda enemy_x
    sta HPOSP1
    sta HPOSP2
    ldy enemy_y
    ldx #$00
@body_loop:
    lda enemy_shape,x
    sta PLAYER1,y
    iny
    inx
    cpx #ENEMY_H
    bne @body_loop

    ldy enemy_y
    iny
    iny
    iny
    iny
    iny
    ldx scanner_phase
    lda scanner_shape,x
    sta PLAYER2,y
    rts

erase_enemy:
    ldy enemy_y
    ldx #ENEMY_H
    lda #$00
@loop:
    sta PLAYER1,y
    sta PLAYER2,y
    iny
    dex
    bne @loop
    rts

reset_enemy:
    lda #$30
    sta enemy_y
    jsr random_byte
    and #$7F
    cmp #(ENEMY_X_RANGE+1)
    bcc :+
    eor #$7F
:
    clc
    adc #ENEMY_X_MIN
    sta enemy_x
    lda rng_state
    and #$01
    sta enemy_direction
    rts

; P1/P2 are double-width and share this sixteen-HPOS envelope. This final
; renderer guard prevents stale or future scripted positions from exposing a
; single fighter pixel over either eight-column capital-hull band.
clamp_enemy_x:
    lda enemy_x
    cmp #ENEMY_X_MIN
    bcs @right
    lda #ENEMY_X_MIN
    sta enemy_x
    lda #$01
    sta enemy_direction
    rts
@right:
    cmp #(ENEMY_X_MAX+1)
    bcc @done
    lda #ENEMY_X_MAX
    sta enemy_x
    lda #$00
    sta enemy_direction
@done:
    rts

; -----------------------------------------------------------------------------
; Collision and score

handle_collisions:
    lda M0PL
    sta BROAD_M0_COLLISION
    lda P0PL
    sta BROAD_P0_COLLISION
    ldx #$00
@capture_heavy:
    lda M1PL,x
    sta BROAD_COLLISION,x
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @capture_heavy

    lda bullet_active
    beq @player_collision
    lda BROAD_M0_COLLISION
    and #$06                    ; missile 0 against players 1 or 2
    beq @player_collision

    jsr erase_bullet
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr add_ten_points
    jsr play_hit_sound

@player_collision:
    lda BROAD_P0_COLLISION
    and #$06                    ; player 0 against enemy body/scanner
    beq @heavy_projectiles
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    ldx #$00
    jsr apply_broadside_player_damage

@heavy_projectiles:
    jsr update_broadside
@clear_latches:
    lda #$00
    sta HITCLR
    rts

add_ten_points:
    sed
    clc
    lda score_bcd_lo
    adc #$10
    sta score_bcd_lo
    lda score_bcd_hi
    adc #$00
    sta score_bcd_hi
    cld
    jsr update_score_display
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
; Starfield

.segment "BROADSIDE"

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
    jsr scroll_world_columns
@hull_rate:
    ldx DIFFICULTY_SETTING
    lda HULL_SCROLL_ACCUMULATOR
    clc
    adc hull_scroll_rates,x
    cmp #HULL_SCROLL_RATE_DENOMINATOR
    bcs @hull_scroll
    sta HULL_SCROLL_ACCUMULATOR
    rts
@hull_scroll:
    sbc #HULL_SCROLL_RATE_DENOMINATOR
    sta HULL_SCROLL_ACCUMULATOR
    jmp scroll_hull_columns

; The 24-column star corridor keeps the accepted gameplay difficulty cadence.
; Only columns 9..30 live directly in screen memory. Columns 8 and 31 have a
; 44-byte backing store because a slower hull-mounted muzzle may cover them.
scroll_world_columns:

    lda #<(SCREEN+23*40)
    sta dst_ptr
    lda #>(SCREEN+23*40)
    sta dst_ptr+1
    lda #<(SCREEN+22*40)
    sta src_ptr
    lda #>(SCREEN+22*40)
    sta src_ptr+1
    lda #21
    sta row_counter

@copy_row:
    ldy #(CORRIDOR_CENTRAL_END-2)
@copy_byte:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    cpy #CORRIDOR_CENTRAL_FIRST
    bne @copy_byte

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

    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    jsr generate_starfield_row
    ldy #CORRIDOR_CENTRAL_FIRST
    lda (dst_ptr),y
    sta CORRIDOR_BOUNDARY_LEFT
    ldy #(CORRIDOR_CENTRAL_END-1)
    lda (dst_ptr),y
    sta CORRIDOR_BOUNDARY_RIGHT
    jsr restore_boundary_stars
    jsr redraw_visible_muzzles
    rts

; The two eight-column hull masses advance from their own half-speed fixed-point
; clock. Muzzle projections are restored from source metadata after the bases
; move, and attached WARNING slots receive exactly the same eight-scanline step.
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
    lda #21
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
    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
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
    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
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
    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    lda #$02
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
    cmp #24
    bne @muzzle_row
    rts

; A fired/reserved bit belongs to one source turret lifecycle. It is cleared
; only after that turret's real muzzle has left all 22 visible hull rows, so a
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
    adc #<(SCREEN+2*40)
    sta dst_ptr
    lda #>(SCREEN+2*40)
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
; path is used only for the initial 22 rows; visible scrolling uses the split
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
    ldy #CORRIDOR_CENTRAL_FIRST
@clear_central:
    sta (dst_ptr),y
    iny
    cpy #CORRIDOR_CENTRAL_END
    bne @clear_central
    jmp fill_starfield_empty_cells

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
    ldy #CORRIDOR_CENTRAL_FIRST
@cell:
    lda (dst_ptr),y
    bne @occupied
    jsr random_byte
    and #$0F
    bne @space
    jsr random_byte
    and #$03
    beq @bright
    lda #CH_DOT
    bne @store
@bright:
    lda #CH_STAR
    bne @store
@space:
    lda #CH_SPACE
@store:
    sta (dst_ptr),y
@occupied:
    iny
    cpy #CORRIDOR_CENTRAL_END
    bne @cell
    rts

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
    .byte "SCORE 00000  FUEL 5  ARM 4  LIFE 100"
    .byte $00

frontend_screen_data:
    .word main_menu_screen_data, options_screen_data, top_scores_screen_data
    .word exit_screen_data, ended_screen_data

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

enemy_shape:
    .byte %10000001
    .byte %11000011
    .byte %11100111
    .byte %01111110
    .byte %00111100
    .byte %01111110
    .byte %11111111
    .byte %01111110
    .byte %11011011
    .byte %11000011
    .byte %10000001
    .byte %10000001

scanner_shape:
    .byte $80,$40,$20,$10,$08,$04,$02,$01
    .byte $01,$02,$04,$08,$10,$20,$40,$80

; ANTIC 4 character set. Each byte stores four two-bit pixels.
; Pixel values: 0=black, 1=white, 2=steel blue, 3=COLPF2 or COLPF3 when
; bit 7 of the screen code is set. The frontend sets COLPF3 to Kawasaki
; green; gameplay restores red before enabling DMA.
charset_data:
    ; 0: space
    .byte $00,$00,$00,$00,$00,$00,$00,$00
    ; 1-8: structural tiles
    .byte $AA,$AA,$AA,$AA,$AA,$AA,$AA,$AA
    .byte $A0,$80,$80,$80,$80,$80,$80,$A0
    .byte $AA,$82,$92,$82,$82,$92,$82,$AA
    .byte $82,$28,$28,$82,$82,$28,$28,$82
    .byte $AA,$A0,$88,$02,$80,$22,$08,$AA
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

missile_masks:
    .byte $0C,$30,$C0
missile_clear_masks:
    .byte $F3,$CF,$3F
missile_double_size_bits:
    .byte $04,$10,$40
missile_quad_size_bits:
    .byte $0C,$30,$C0
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
    ldx #(GAMEPLAY_RESIDENT_END-CAPITAL_EXPLOSION_TIMER)-1
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
    lda #$05                    ; five 20-point units, directly deriving 100%
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
    cmp #(BROADSIDE_RETURN_TO_MENU_FRAMES-6)
    bne :+
    jsr erase_player
:
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
    lda #PLAYER_RESPAWN_X
    sta player_x
    sta HPOSP0
    sta HPOSP3
    lda #PLAYER_RESPAWN_Y
    sta player_y
    lda #$05
    sta BROAD_PLAYER_HEALTH
    lda #$00
    sta BROAD_DEATH_TIMER
    sta BROAD_DAMAGE_COOLDOWN
    sta BROAD_DAMAGE_APPLIED
    sta damage_timer
    sta RESPAWN_BLINK_FRAME
    jsr update_life_display
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
    ldx #(BROADSIDE_SLOT_COUNT-1)
@heavy:
    sta BROAD_COLLISION,x
    dex
    bpl @heavy
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
    jsr draw_broadside_slug
    jmp @next
@draw_warning:
    jsr render_broadside_warning
    jmp @next

@flying:
    lda BROAD_COLLISION,x
    and #$09                    ; P0 hull or P3 engine layer
    beq @fighter_collision
    jsr begin_broadside_impact
    jsr apply_broadside_player_damage
    jmp @next
@fighter_collision:
    lda BROAD_OWNER,x
    bne @move
    lda BROAD_COLLISION,x
    and #$06                    ; allied shell against P1/P2 hostile fighter
    beq @move
    jsr begin_broadside_impact
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr play_hit_sound
    jmp @next
@move:
    lda BROAD_OWNER,x
    bne @move_left
    lda BROAD_X,x
    clc
    adc #BROADSIDE_PROJECTILE_SPEED
    sta BROAD_X,x
    jmp @hull
@move_left:
    lda BROAD_X,x
    sec
    sbc #BROADSIDE_PROJECTILE_SPEED
    sta BROAD_X,x
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
    jsr draw_broadside_slug
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
    adc #<(SCREEN+3*40)
    sta dst_ptr
    lda #>(SCREEN+3*40)
    adc #$00
    sta dst_ptr+1
    lda #$03
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
    cmp #>(SCREEN+24*40)
    bcc @next_explosion
    bne @expire_explosion
    lda CAPITAL_EXPLOSION_ROW_LO,x
    cmp #<(SCREEN+24*40)
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
    lda #CAPITAL_HULL_STATE_COMPLETE
    sta CAPITAL_SECTOR_STATE
@done:
    rts

apply_broadside_player_damage:
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
    dec BROAD_PLAYER_HEALTH
    lda #$12
    sta damage_timer
    jsr play_hit_sound
    jsr update_life_display
    lda BROAD_PLAYER_HEALTH
    bne @done
    lda #PLAYER_DYING
    sta PLAYER_LIFECYCLE
    lda PLAYER_LIVES
    beq :+
    dec PLAYER_LIVES
:
    lda #BROADSIDE_RETURN_TO_MENU_FRAMES
    sta BROAD_DEATH_TIMER
    jsr erase_bullet
@done:
    rts

.segment "BROADSIDE"
update_life_display:
    lda #CH_ZERO
    sta SCREEN+33
    sta SCREEN+34
    sta SCREEN+35
    lda BROAD_PLAYER_HEALTH
    cmp #$05
    bcc @under_one_hundred
    lda #CH_ZERO+1
    sta SCREEN+33
    rts
@under_one_hundred:
    tax
    lda life_tens_digits,x
    clc
    adc #CH_ZERO
    sta SCREEN+34
    rts

life_tens_digits:
    .byte 0,2,4,6,8

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

broadside_hits_opposite_hull:
    stx BROAD_WORK_SLOT
    lda BROAD_Y,x
    sec
    sbc #BROADSIDE_SCREEN_TOP
    bcc @miss
    lsr
    lsr
    lsr
    cmp #24
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
    adc #$02
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
    sbc #$02
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

clear_broadside_pool:
    jsr restore_capital_explosions
    ldx #$00
@slot:
    jsr free_broadside_slot
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @slot
    ldx #$00
@flash:
    lda BROAD_FLASH_TIMER,x
    beq :+
    jsr restore_launch_flash_cell
    lda #$00
    sta BROAD_FLASH_TIMER,x
:
    inx
    cpx #BROADSIDE_SLOT_COUNT
    bne @flash
    lda #$00
    sta CAPITAL_EXPLOSION_TIMER
    sta CAPITAL_EXPLOSION_TIMER+1
    sta CAPITAL_EXPLOSION_SOUND_TIMER
    sta AUDC4
    rts

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

; A two-frame 3/4-scanline pulse gives M1-M3 a compact reinforced-slug shape.
; Double width and the four-line maximum are unchanged, so the accepted GTIA
; collision envelope never grows. COLPM1-COLPM3 are not touched.
draw_broadside_slug:
    lda frame_counter
    lsr
    and #$01
    beq @compact
    lda #BROADSIDE_FLYING_HEIGHT
    jmp draw_broadside_span
@compact:
    lda #(BROADSIDE_FLYING_HEIGHT-1)
    jmp draw_broadside_span

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

set_broadside_slot_quad:
    lda SIZEM
    and missile_clear_masks,x
    ora missile_quad_size_bits,x
    sta SIZEM
    rts

.assert * - __BROADSIDE_RUN__ <= $1200, error, "broadside runtime exceeds relocation block"

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

; The two-row HUD uses genuine 40-column ANTIC 2 text. A DLI after its divider
; installs the gameplay charset/palette before 22 ANTIC 4 corridor rows; the
; final-row DLI restores the dedicated HUD font for the next PAL frame.
display_list:
    .byte $70,$70,$70              ; 24 blank scan lines
    .byte $42,<SCREEN,>SCREEN      ; ANTIC 2 HUD + LMS
    .byte $82                      ; ANTIC 2 divider + DLI
    .repeat 21
        .byte $04
    .endrepeat
    .byte $84                      ; final ANTIC 4 row + DLI
display_list_jvb:
    .byte $41,<display_list,>display_list

    .assert MAIN_MENU_SCREEN_BYTES <= $400, error, "main-menu screen data exceeds shared buffer"

.include "loader-screen.inc"
