.setcpu "6502"

; Dark Fighter 0.1 vertical slice
; Target: stock Atari 65XE PAL, 64 KB

.export start
.export boot_return

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
SIZEP0      = $D008
SIZEP1      = $D009
SIZEP2      = $D00A
SIZEP3      = $D00B
SIZEM       = $D00C
M0PL        = $D008
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

PLAYER_H    = 16
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
CH_COLON    = 26
CH_QUESTION = 31

KAWASAKI_GREEN = $D8
GAMEPLAY_COLPF3 = $46

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
scroll_timer:       .res 1
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

    sta game_state                 ; STATE_LOADER
    jsr unpack_loader_bitmap
    jsr show_loader

    ; Rebuild the gameplay and mixed-mode frontend displays with DMA off.
    ; This also reclaims loader-only payload bytes before Player 2 PMG data.
    jsr clear_pmg
    jsr copy_charset
    jsr copy_frontend_charset
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
    jsr enter_main_menu
    jmp frontend_loop

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
    ldx #$01
    lda stick_value
    and #$01
    beq move_selection_up
    lda stick_value
    and #$02
    beq move_selection_down
    lda frontend_selection
    bne @back_row
    lda stick_value
    and #$0C
    cmp #$0C
    bne toggle_sound
    lda TRIG0
    beq toggle_sound
    rts
@back_row:
    lda TRIG0
    bne @done
    jmp enter_main_menu
@done:
    rts

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
    ldy #$02
    cmp #STATE_OPTIONS
    beq @clear
    ldx #$06
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
    jsr init_screen
    jsr draw_player
    jsr draw_enemy
    jsr update_score_display
    sta HITCLR

    lda #<display_list
    sta DLISTL
    lda #>display_list
    sta DLISTH
    lda #>CHARSET
    sta CHBASE

    lda #$01                   ; undo the menu-only wide PMG craft
    sta SIZEP0
    sta SIZEP3
    lda #$28                   ; restore amber gameplay telemetry
    sta COLPF2
    lda #GAMEPLAY_COLPF3       ; restore red structural accents for gameplay
    sta COLPF3

    lda sound_enabled
    beq @display
    lda #$68                    ; quiet, continuous engine bed
    sta AUDF3
    lda #$22
    sta AUDC3
@display:
    jsr wait_frame_start
    lda #$03                    ; enable players and missiles
    sta GRACTL
    lda #$3E                    ; normal playfield, single-line PMG DMA
    sta DMACTL

main_loop:
    jsr wait_frame
    inc frame_counter

    jsr read_input
    jsr update_bullet
    jsr update_enemy
    jsr handle_collisions
    jsr update_starfield
    jsr update_sound

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
    lda #$80
    sta player_x
    lda #$B8
    sta player_y

    lda #$78
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
    sta corridor_phase

    lda #$04
    sta scroll_timer
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
@corridor_rows:
    jsr generate_corridor_row
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
    jsr draw_player

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
    lda #$03
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
    lda #$00
    sta MISSILES,y

    lda bullet_y
    cmp #$28
    bcc @deactivate
    sec
    sbc #$04
    sta bullet_y
    tay
    lda #$03
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
    lda #$00
    sta MISSILES,y
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
    inc enemy_x
    lda enemy_x
    cmp #$C8
    bcc @scanner
    lda #$00
    sta enemy_direction
    jmp @scanner
@move_left:
    dec enemy_x
    lda enemy_x
    cmp #$38
    bcs @scanner
    lda #$01
    sta enemy_direction

@scanner:
    inc scanner_phase
    lda scanner_phase
    and #$0F
    sta scanner_phase

draw_enemy:
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
    clc
    adc #$38
    sta enemy_x
    lda rng_state
    and #$01
    sta enemy_direction
    rts

; -----------------------------------------------------------------------------
; Collision and score

handle_collisions:
    lda bullet_active
    beq @player_collision
    lda M0PL
    and #$06                    ; missile 0 against players 1 or 2
    beq @player_collision

    jsr erase_bullet
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr add_ten_points
    jsr play_hit_sound

@player_collision:
    lda P0PL
    and #$06                    ; player 0 against enemy body/scanner
    beq @clear_latches
    jsr erase_enemy
    jsr reset_enemy
    jsr draw_enemy
    jsr play_hit_sound
    lda #$12
    sta damage_timer

@clear_latches:
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

update_starfield:
    dec scroll_timer
    bne @done
    lda #$04
    sta scroll_timer

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
    ldy #39
@copy_byte:
    lda (src_ptr),y
    sta (dst_ptr),y
    dey
    bpl @copy_byte

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

    lda #<(SCREEN+80)
    sta dst_ptr
    lda #>(SCREEN+80)
    sta dst_ptr+1
    jsr generate_corridor_row
@done:
    rts

; Generates one bounded row: six structural cells per side and 28 star cells.
; Called once every four frames after the 840-byte background copy.
generate_corridor_row:
    lda corridor_phase
    and #$07
    tax
    lda corridor_row_offsets,x
    tax
    ldy #$00
@left_wall:
    lda corridor_left_tiles,x
    sta (dst_ptr),y
    inx
    iny
    cpy #$06
    bne @left_wall

    lda corridor_phase
    and #$07
    tax
    lda corridor_row_offsets,x
    tax
    ldy #34
@right_wall:
    lda corridor_right_tiles,x
    sta (dst_ptr),y
    inx
    iny
    cpy #40
    bne @right_wall

    ldy #$06
@cell:
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
    iny
    cpy #34
    bne @cell
    inc corridor_phase
    rts

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
    bne @damage
    lda #$00
    sta AUDC2

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
    rts

; -----------------------------------------------------------------------------
; Read-only data

.segment "RODATA"

hud_ascii:
    .byte "SCORE 00000  FUEL 5  ARM 4  LIFE X03"
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

corridor_row_offsets:
    .byte 0,6,12,18,24,30,36,42

corridor_left_tiles:
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_EDGE,   CH_PANEL_FRAME,  CH_PANEL_TRUSS
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_RIVET, CH_PANEL_SOLID,  CH_PANEL_FRAME,  CH_PANEL_TRUSS
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_DAMAGE, CH_SPACE,        CH_PANEL_EDGE
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_FRAME, CH_PANEL_FRAME,  CH_SPACE,        CH_SPACE
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_RIVET,  CH_PANEL_TRUSS,  CH_SPACE
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_DAMAGE,CH_PANEL_SOLID,  CH_PANEL_TRUSS,  CH_PANEL_EDGE
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_FRAME, CH_SPACE,        CH_SPACE,        CH_PANEL_TRUSS
    .byte CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID, CH_PANEL_EDGE,   CH_PANEL_RIVET,  CH_PANEL_TRUSS

corridor_right_tiles:
    .byte CH_PANEL_TRUSS, CH_PANEL_FRAME,  CH_PANEL_EDGE,  CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_PANEL_TRUSS, CH_PANEL_FRAME,  CH_PANEL_SOLID, CH_PANEL_RIVET, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_PANEL_EDGE,  CH_SPACE,        CH_PANEL_DAMAGE,CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_SPACE,       CH_SPACE,        CH_PANEL_FRAME, CH_PANEL_FRAME, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_SPACE,       CH_PANEL_TRUSS,  CH_PANEL_RIVET, CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_PANEL_EDGE,  CH_PANEL_TRUSS,  CH_PANEL_SOLID, CH_PANEL_DAMAGE,CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_PANEL_TRUSS, CH_SPACE,        CH_SPACE,       CH_PANEL_FRAME, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID
    .byte CH_PANEL_TRUSS, CH_PANEL_RIVET,  CH_PANEL_EDGE,  CH_PANEL_SOLID, CH_PANEL_STRIPE|$80, CH_PANEL_SOLID

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

; Frontend sources occupy otherwise-unused gameplay charset slots 59-127.
; Forty-two 6x7 glyphs are stored as seven rows each; the runtime builder adds
; blank eighth rows and copies ANTIC 4 structural glyphs into indices 44-59.
frontend_charset_data:
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

; Screen stream: screen address, zero-terminated ASCII; $FF ends a screen.
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
    .word SCREEN+14*40+18
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
    .word SCREEN+10*40+12, SCREEN+14*40+16
    .word SCREEN+13*40+12, SCREEN+13*40+21

top_score_row_template:
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_SPACE,CH_FRONT_SPACE
    .byte CH_FRONT_DASH,CH_FRONT_DASH,CH_FRONT_DASH,CH_FRONT_SPACE,CH_FRONT_SPACE
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_ZERO
    .byte CH_FRONT_ZERO,CH_FRONT_ZERO,CH_FRONT_ZERO
frontend_charset_data_end:

    .assert frontend_glyph_rows_end - frontend_glyph_rows = FRONTEND_GLYPH_COUNT*7, error, "frontend glyph source size changed"
    .assert frontend_charset_data_end - frontend_charset_data = 541, error, "frontend compact data size changed"
    .repeat 11
        .byte $00
    .endrepeat

    .assert * - charset_data = $400, error, "gameplay charset image must remain 1024 bytes"

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

; Gameplay remains byte-for-byte compatible with the accepted ANTIC 4 view.
display_list:
    .byte $70,$70,$70              ; 24 blank scan lines
    .byte $44,<SCREEN,>SCREEN      ; ANTIC 4 + LMS
    .repeat 23
        .byte $04
    .endrepeat
    .byte $41,<display_list,>display_list

    .assert MAIN_MENU_SCREEN_BYTES <= $400, error, "main-menu screen data exceeds shared buffer"

.include "loader-screen.inc"
