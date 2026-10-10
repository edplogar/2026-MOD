import type { ModReportItem, PictureItem, Department, ReportStatus, PriorityLevel, ShiftType } from '../types/index.ts';

export const RAW_MOD_CSV = `Timestamp,Name,Date,Location,Problem,Follow Up,Picture
12/5/2025 19:37:32,Iwayan Suardana ,12/5/2025 18:00:00,Gedung 5 lantai,Sikon aman ,,"https://drive.google.com/open?id=1yc-jpV6KOImEi4pGE3bWmQugJNtQKa-L, https://drive.google.com/open?id=1kF6W1A0Ln0Nl2v3g0MqN6posJ8mu-1tZ, https://drive.google.com/open?id=1sLFrgaDJ0jUXB_acWyd5ueCznsL73ACJ, https://drive.google.com/open?id=1i7iv9XrOxpCuCHFuazpxPtVsWs2RBp7S, https://drive.google.com/open?id=1-VESPiCQnskv5BeBxDen23q6tz_rM6Lt"
12/5/2025 20:43:00,Iwayan Suardana ,12/5/2025 19:30:00,Kantin eng loundry office belakang parkir,Sikon aman ,,"https://drive.google.com/open?id=1EgEmRAuLja6dx9yGq2RBLcM5cSFT5NNe, https://drive.google.com/open?id=1gJpifLCSV2PqWKZEidOIAz2W8V-LLeVi, https://drive.google.com/open?id=1r7JCQ8GRvy00EA8Jdi5dIcIYScDFAclv, https://drive.google.com/open?id=1VkYXyjs-KqTBFHRoLvpK2jPmpZI_2PWt, https://drive.google.com/open?id=18ZvQIgURK6cAlOjnITsKEFMSRxAo7ZoU"
12/5/2025 20:47:46,Iwayan Suardana ,12/5/2025 20:00:00,Resto pantry kitchen Steward store,Sikon aman ,,"https://drive.google.com/open?id=1C2Uh94DmtEt_s6SH9v9d7CSLSfepk8i_, https://drive.google.com/open?id=17FNdeQtgUj6tTsJznF4jycPeu2htpxol, https://drive.google.com/open?id=1tYev3vRRYePjLtkKm3XkGs89FUoAgYup, https://drive.google.com/open?id=13RDfjSt4xe7--PvpFviYbkEwjcTgUiJR, https://drive.google.com/open?id=1OGfhwgXTj4y3ONTbySFixEJKK0qSmXO8"
12/5/2025 21:15:30,Iwayan Suardana ,12/5/2025 21:00:00,Garden melati ballroom cottage parkiran utara,Sikon aman ,,"https://drive.google.com/open?id=1XbpptqKZVCLGESI3epVHhxPkY3lpAryi, https://drive.google.com/open?id=1sVaa-dzvJeds_nvFrfCekjKz0thzAHZ5, https://drive.google.com/open?id=1382wRUM0mAExeeAuaBfft3kOLTroG0BE, https://drive.google.com/open?id=137TKLqHB2dMxYklj7hiLDgyeIX_6LOED, https://drive.google.com/open?id=1QIV69axIp89AzJx0tWaJYpgchtXaGEq4"
12/5/2025 21:33:34,Iwayan Suardana ,12/5/2025 21:30:00,Parkir selatan fo lotus cottage pool acces,Sikon aman ,,"https://drive.google.com/open?id=1bWZxe_uU1_23CA5XpSJR03njPcUAKsfv, https://drive.google.com/open?id=1UyXjex-DVLaOdZ4o48y9t-b2VJDF8zzG, https://drive.google.com/open?id=1UBvzFemR5_g2aUn2jNxFuST0OwuUqhkV, https://drive.google.com/open?id=1mQODjoMgIY133ErcxUXPZGAT_emh1gba, https://drive.google.com/open?id=1hBjwOU7ISYHU5jPGIdvtRZaHaX7LDbBc"
12/6/2025 14:09:54,Candra,12/6/2025 13:53:00,Parkir sepeda motor karyawan ,No Problem ,,https://drive.google.com/open?id=1L_YB4E9t5wKF0_BKnOXwDo30hkz4p4Ex
12/6/2025 14:11:07,Candra,12/6/2025 13:53:00,Loker karyawan ,No Problem ,,https://drive.google.com/open?id=1jVOqxoI6bNU4Ezjy-ayUFUyFdkzWP9cs
12/6/2025 14:16:33,Candra,12/6/2025 14:14:00,Genset ,Clean,,https://drive.google.com/open?id=12CldI7qBH5ejz3INaBG7Z9R3uuK20V8k
12/6/2025 14:17:51,Candra,12/6/2025 14:14:00,Area Dropzone Melati ,No Problem ,,https://drive.google.com/open?id=1NNMc1VrAY03CVO1riwrH3vkzSi03rDoD
12/6/2025 14:25:43,Candra,12/6/2025 14:27:00,Area parkir depan lobby,No Problem ,,https://drive.google.com/open?id=1KVcOKsk6ETfBcbr6O-8EjFTESa7ZW99y
12/6/2025 14:31:09,Candra ,12/6/2025 14:30:00,Gudang samping kamar 111,Kotor ,Housekeeping,https://drive.google.com/open?id=1QVBEoyHH5bRuKJoAKdeYWIjpt6xugTKF
12/6/2025 14:32:16,Candra ,12/6/2025 14:31:00,Housekeeping ,Clean ,,https://drive.google.com/open?id=1mis1KjyCbhHP1dacdfuO2FjUPjU1GmMR
12/6/2025 14:35:56,Candra ,12/6/2025 14:35:00,Kitchen ,No Problem ,,https://drive.google.com/open?id=1C8hP_XV2Qg_6UbtsJ9bPme9LetxzgDAt
12/6/2025 14:36:39,Candra,12/6/2025 14:35:00,Restoran Flamboyan ,Clean,,https://drive.google.com/open?id=1sr3ehy4FzPbodCbe3Y3gZTG_pkOptGSI
12/6/2025 14:48:22,Candra,12/6/2025 14:45:00,Room deluxe ,No Problem ,,"https://drive.google.com/open?id=1HpA65RpCEmpkcOvvgolBuOUV-d6oFZ5I, https://drive.google.com/open?id=1NYAbORyyh46xV5PQZv4bLIyuLskiKt2W, https://drive.google.com/open?id=1GjhSGbPjT2v5Cm4vtK_plGp53ASR1RqW, https://drive.google.com/open?id=1f4cFH7gjhEcTJsdAxsRpMHxA6YzrABkB"
12/6/2025 14:56:16,Candra,12/6/2025 14:50:00,Area Laundry& Tekhnisi ,No Problem ,,https://drive.google.com/open?id=1DkjQ2gIuX0nNUI5KOQLn0SEXzthtrSpj
12/6/2025 15:00:52,Candra,12/6/2025 14:59:00,Melati ,No Problem ,,https://drive.google.com/open?id=11hXtfdnGFGHzzOuq-qBvOYXXZG1aSzcM
12/9/2025 17:03:40,I Komang Artana ,12/9/2025 16:15:00,Delux area,Clean,,
12/9/2025 17:13:55,I Komang Artana ,12/9/2025 16:35:00,Melati area,Clean,,
12/9/2025 17:15:29,I Komang Artana ,12/9/2025 16:50:00,Genset area,Clean,,
12/9/2025 18:12:14,I Komang Artana ,12/9/2025 17:20:00,Kitchen,Team buat kue utk 267,Fb Product,https://drive.google.com/open?id=119Ep3lqQ-lJ7sYWo9Pfu4zB1ndYFMCrK
12/9/2025 19:21:02,I Komang Artana ,12/9/2025 19:20:00,Loby area,Clean,,
12/9/2025 19:22:20,I Komang Artana ,12/9/2025 19:22:00,Lotus area,Clean ,,
12/9/2025 21:25:13,I Komang Artana ,12/9/2025 20:45:00,Parkiran ,Clean,,
12/11/2025 15:07:43,defi,12/10/2025 17:15:00,pool barat,banyak tamu member yg renang,Housekeeping,https://drive.google.com/open?id=1I8wyKBHHUVCCEkhX-90E2DO2ZEWqUbdQ
12/11/2025 15:10:02,Defi,12/10/2025 18:45:00,kitchen,cleaning tempat telur & kotak sampah,Fb Product,"https://drive.google.com/open?id=1KcE4RwS0dekiD3c7MJ-ZjvW1U_VcldeM, https://drive.google.com/open?id=19WvnvmONXmSXozlvFCknwwQVhIrD9nJY, https://drive.google.com/open?id=1N4qHS9qfubkFr8RgsChFnByPL8qOfzDY"
12/11/2025 15:12:08,dedi,12/10/2025 20:20:00,lobby ,banyak tamu chek in,Front Office,"https://drive.google.com/open?id=1h0osGpZ59_FM5vxLJ4R6ZXQqtlapH1MS, https://drive.google.com/open?id=1Lplf7FzgzZo7pXzpXqKgs9B3nvVXlVLT"
12/12/2025 15:58:54,naning,12/11/2025 16:42:00,Area Lotus cafe & pool barat,tdk ada,,"https://drive.google.com/open?id=1WQ5CHz7id5m_6fw6wE_sH0Hicc13bUpA, https://drive.google.com/open?id=1OOMXjiIeKbOzZArHfjkndWEJEOx_ikWp, https://drive.google.com/open?id=1Cf0hcn6wwxadgQBLi13T1i-IPsMaEsaI"
12/12/2025 16:00:35,naning,12/11/2025 17:00:00,Area Lobby & Parkiran,tdk ada,,"https://drive.google.com/open?id=1DXS1qC0YfPDuaGv0wvkP5AZn9vdsTYjn, https://drive.google.com/open?id=1dcejC_uYgoK49SaTjrkpU-ODKAz0mnkv, https://drive.google.com/open?id=1wycYVp-ycpvLghY4H4S5RF7gtvgh01iz, https://drive.google.com/open?id=19k6h-YWrutHweynSnaNBegWbbr5TgTHc, https://drive.google.com/open?id=1zuzEdaZea2EQSpNVDG76kTUSCtuBsS-Z"
12/12/2025 16:02:09,naning,12/11/2025 17:20:00,Area Pool Timur,tdk ada,,"https://drive.google.com/open?id=11D16Aoo9y5tnleHyLhnWX2KMjuCPmlsH, https://drive.google.com/open?id=1G0aJ418UEi4I8_8yEWeJhwnv6pz4Lm_p, https://drive.google.com/open?id=1h1DGK3HdhpkO5_d5TAokFOsSPpHmYbyV"
12/12/2025 16:03:34,naning,12/11/2025 17:25:00,Area flamboyan resto & kitchen,tdk ada,,"https://drive.google.com/open?id=1tV_3Lkeo0C8OCeiQ17xvK3paYwuLyp1e, https://drive.google.com/open?id=1p33EZayki2Cgvy-fezpxsvqIr4MgTUmO"
12/12/2025 16:06:08,naning,12/11/2025 18:50:00,Area melati hall dan resto,"Tdk ada, hanya proses dekorasi untuk event Apple Tree",,"https://drive.google.com/open?id=1a_7g65cVYRkgMj3TLo7K8SNF1OhXQw1U, https://drive.google.com/open?id=19h5iQmRyk2cja1McbXpmWCgxLnfJqrhN, https://drive.google.com/open?id=1VBfHVnyES7CMg0IPFDxgqtdIflQswHTR, https://drive.google.com/open?id=1auu2Li4Wc3gp0i1J3EKtS4-OhG2-atki"
12/12/2025 19:53:37,Iwayan suardana ,12/12/2025 19:30:00,Gedung lantai 5,Situasi aman ,,"https://drive.google.com/open?id=1MJEjehWzdz4DYGa__MKs66TuGaU_9UCN, https://drive.google.com/open?id=1LuVPgHJsqZIRZ5ehlazvx35Nd6ji8VrL, https://drive.google.com/open?id=1xJO4XZtML3fL2D-PIg_oYm6tRsN3v8jD, https://drive.google.com/open?id=1FSkQDIascibhQG2XzM5cUQvO0IT9Njr1, https://drive.google.com/open?id=10CwUhLl9CqHT1U80Hyo_yFy9ds6HXBlN"
12/12/2025 20:01:15,Iwayan suardana ,12/12/2025 19:55:00,Kantin eng loundry parkiran belakang ,Situasi aman ,,"https://drive.google.com/open?id=1mDq8zIHQfo0acOWSuG7D6yw6qnAKsJLL, https://drive.google.com/open?id=14kG6NNnth0nhjGGGWMMCFcPQnro0KyGf, https://drive.google.com/open?id=1LI-nmFWWpllC6PnCVBUKHBQ4VA-hgl4V, https://drive.google.com/open?id=1y9Cn_nroFsiQLCLB1-SvG1KZUDs4KuwY, https://drive.google.com/open?id=1gBb0hMQBsVXjgJ65QDDS9AOTly4KQLTJ"
12/12/2025 20:48:00,Iwayan Suardana ,12/12/2025 20:30:00,Garden melati ballroom cottage ,Sikon aman ,,"https://drive.google.com/open?id=1yMNIfoBFeO2TpNPH8kl_Bn1oFPfPlZ6B, https://drive.google.com/open?id=1zV-1VZv6Z0LBEBAi8nQ1p_DFd2HR7teN, https://drive.google.com/open?id=1rTu1ilI01CDY5zK18qZ0rEf3ltczVlp0, https://drive.google.com/open?id=1M6I7EVl9Ykcrwj6WxcMltXXcjUghTOuN"
12/12/2025 21:27:12,Iwayan suardana ,12/12/2025 21:00:00,Resto pantry kitchen Steward store,Sikon aman ,,"https://drive.google.com/open?id=1w_0tArYDppLASDI5CSEgNg9FFnGGxoLu, https://drive.google.com/open?id=1xlUUBXArxRlAJbbmrFMj1C-hbUYmLWFl, https://drive.google.com/open?id=1I_XNOp6O_gooVlrzGCPxKwH1kR2y4tfT, https://drive.google.com/open?id=1opsMDiwhWQs3aJBbhhiptG04GZ-yzKJU, https://drive.google.com/open?id=1VoF2HjUIl57JFl-J461kaQ2JeKb8SvN0"
12/12/2025 22:43:01,Iwayan Suardana ,12/12/2025 22:00:00,Parkir Utara parkir barat lobby lotus cottage pool acces ,Sikon aman ,,"https://drive.google.com/open?id=12ikX4fUpiR2st7mFngjpX42U2EHJMpAA, https://drive.google.com/open?id=1en1P2qB2zn1BowbnCN_gXmVPOxLDWpnp, https://drive.google.com/open?id=1Mzxj_BSVDNEV5yu4DfG8cqMmdy5VRR7F, https://drive.google.com/open?id=1vPRfqusoPLdlBeK3JXk5yoF9wqzAmJ7W, https://drive.google.com/open?id=1XNvqx6s0o_WgS46jeW6-cxEHTHytjVOj"
12/13/2025 15:36:01,I Wayan kresna ,12/13/2025 15:35:00,Koridor area kamar ,Clean ,Housekeeping,https://drive.google.com/open?id=1iyC565gLkT55kuvFas8jfQ1iM_1kAyqQ
12/13/2025 15:50:08,I Wayan kresna ,12/13/2025 15:49:00,Melati ballroom ,Clean ,Housekeeping,https://drive.google.com/open?id=1Cz7N1Xot6zKVEW43e-Hy8E9Wa1ccTtjT
12/13/2025 18:23:54,I Wayan kresna ,12/13/2025 18:23:00,Flamboyan resto ,Ada dinner,,https://drive.google.com/open?id=1a4rDfggB5s29XFPFsWmGUuK1R-4UNWba
12/13/2025 18:30:52,I Wayan kresna ,12/13/2025 18:32:00,Loby area ,Clean ,Housekeeping,https://drive.google.com/open?id=1tZqpfuRAMQcGUDydcXgeMQFNH9dXzyrY
12/13/2025 18:32:04,I Wayan kresna ,12/13/2025 18:33:00,Parkiran depan ,Aman ,,https://drive.google.com/open?id=17EaN3jCDlnb6s7nu_6Fh0WSOQ8CKTPFZ
12/13/2025 18:42:07,I Wayan kresna ,12/13/2025 18:42:00,Lotus cafe ,Aman ,,https://drive.google.com/open?id=1pUwYbkZ6T25WIg8v2v3aGdJoRs53-ivc
12/13/2025 18:43:18,I Wayan kresna ,12/13/2025 18:43:00,Pool baret ,Aman ,,https://drive.google.com/open?id=17lLuB7GlT7qQpEf4tGZ2CJxzehmD7KR0
12/13/2025 19:12:21,I Wayan kresna ,12/13/2025 19:10:00,Kitchen ,Aman ,,https://drive.google.com/open?id=1SRyFil6InrLaxXcmkDSb8UD739N_VD2M
12/13/2025 19:14:59,I Wayan kresna ,12/13/2025 19:15:00,Deluxe building area ,Clean ,Housekeeping,https://drive.google.com/open?id=13Zi5vBMgQHeZfWfCRUg0iNhoyLwD8A8T
12/14/2025 8:29:08,Candra,12/14/2025 7:49:00,Parkir sepeda motor karyawan ,Bongkaran proyek sudah mulai menumpuk,,https://drive.google.com/open?id=1LQe4nCVmG0BAVVMvTkGcAo4R_aIaX8Kg
12/14/2025 8:30:22,Candra,12/14/2025 7:50:00,Loker karyawan ,No Problem ,,https://drive.google.com/open?id=1zHVSbbyvH20OX0SqrqPn4uvNUAUwbeHv
12/14/2025 8:32:26,Candra,12/14/2025 7:50:00,Area laundry ,No problem ,,https://drive.google.com/open?id=196CLNFuFuXySSLVsfqDy1ar5PKsTfoPp
12/14/2025 8:39:05,Candra,12/14/2025 7:56:00,Area genset ,No Problem ,,https://drive.google.com/open?id=1DANbpfH0wGwh8PuzOw9JKnsI4BavOdXP
12/14/2025 8:40:19,Candra,12/14/2025 7:57:00,Area parkir sepeda motor tamu,No problem,,https://drive.google.com/open?id=1hL74SxlzBild0BvpfAe6vm78qLrV5r4D
12/14/2025 9:00:46,Candra,12/14/2025 8:59:00,Gudang samping kamar 111,Sedang dibersihkan kotor an daun jambu,Housekeeping,https://drive.google.com/open?id=19wqiPP_14JA-JBU0WI9BrPBexW0Us8lI
12/14/2025 9:01:53,Candra,12/14/2025 9:00:00,Housekeeping ,Clean,,https://drive.google.com/open?id=1VVfBEPrSedSn5eyCEXIx00wMEEmQHg7k
12/14/2025 9:06:24,Candra,12/14/2025 9:05:00,Kitchen ,Clean,,https://drive.google.com/open?id=1v6luU89FZ3j-WvYrpVlbFAcIQ71CkNmc
12/14/2025 9:08:08,Candra,12/14/2025 9:07:00,Restoran Flamboyan ,No Problem ,,https://drive.google.com/open?id=1vOOqhGV2km13kUsdwEYg3zFTtOTgotei
12/14/2025 9:24:23,Candra,12/14/2025 9:15:00,Room deluxe ,No Problem ,,"https://drive.google.com/open?id=1Y4dL9HAx7m4UP31MDEumJ9kbrL-v3VXC, https://drive.google.com/open?id=1M-mB3sZQ75xfDhOFZjgecr7lEI5qlOwo, https://drive.google.com/open?id=1jiFh02gzDAPF4CTYMVWyqw22itUC2VDy, https://drive.google.com/open?id=1IBH7aHl4viu3jz-UGeiPsghnWuLw32HC, https://drive.google.com/open?id=141G72LO6uHEQ5aOYBT5N7yy2azo-SDjQ"
12/14/2025 9:27:05,Candra,12/14/2025 9:26:00,Melati ,Clean ,,https://drive.google.com/open?id=1sSDOhiJ5MxfYal-Yc0mmfuBFPO2FSgIy
12/15/2025 17:20:43,Iwayan Suardana ,12/15/2025 17:00:00,Gedung 5 lantai ,Sikon aman ,,"https://drive.google.com/open?id=1PprZq9HlY6bKfjZBe0bibHChX6-QBlEi, https://drive.google.com/open?id=1YwBZHIHk6VruF62F_aH05csp5DAECPq7, https://drive.google.com/open?id=1f2YdQB22IccsBzDZm41cZq6uCcl1fQ4G, https://drive.google.com/open?id=1LBiPPE55UhElTBgZpAL96SMewqyvltvA, https://drive.google.com/open?id=1bmW2zP8Pav5SzNFirw-mIiHVm8-9K6fM"
12/15/2025 21:09:55,Iwayan Suardana ,12/15/2025 20:05:00,Resto pantry kitchen Steward store ,Situasi aman ,,"https://drive.google.com/open?id=1Uv7-G9dIVPKOn6WoUG5wKihia3DbIS_7, https://drive.google.com/open?id=1487lvZyb0u1gLTnrFtiHDZDqWKsxxO-9, https://drive.google.com/open?id=1W7lq4olZgHvKyhcpO7z9A05x5lXxUWPP, https://drive.google.com/open?id=1T6gDqmoAphmM3nhyb__Fd1vEAUtC9AfJ, https://drive.google.com/open?id=1vMl3E2DFw5pC4hcGXb66ZSFdoYIuxhkd"
12/15/2025 21:37:32,Iwayan Suardana ,12/15/2025 21:00:00,Parkir belakang loundry eng kantin office hrs ,Sikon aman ,,"https://drive.google.com/open?id=19JO_ZhwYpG4onwXAq9eqD67FN-lESAyi, https://drive.google.com/open?id=1rb_KqPK1ylMzMk7SCnPPxQh3P0lCCBli, https://drive.google.com/open?id=1sgzTRIQoI_asWBI9j5jj5Lz7q13yiWDr, https://drive.google.com/open?id=1A5UC19oKWmuzXKMBlfass8ubhaSgh5i0, https://drive.google.com/open?id=1FKkFj3bifFn-yQQMXVtGLNmZh06x88Mc"
12/15/2025 21:40:16,Iwayan Suardana ,12/15/2025 21:15:00,Garden melati ballroom cottage parkir utara,Sikon aman ,,"https://drive.google.com/open?id=16pr8Wj0LMP1lN2AsOEPdpTFZQxy6mAZO, https://drive.google.com/open?id=1xrivtQNt7vBJ0_-DPjq_M-C_Wq8maLqT, https://drive.google.com/open?id=1oDhCKdtzkUpC99lJ8NeWEoV9H07qCZUQ, https://drive.google.com/open?id=1Sjbn-0Dr4cQUZorcfRRyyEogzqoXRsS3, https://drive.google.com/open?id=1XfseTwtUAFN4XpQoZ4fsxEgTH9-G4xNh"
12/15/2025 21:44:46,Iwayan Suardana ,12/15/2025 21:41:00,Parkir depan lobby lotus cottage pool acces ,Sikon aman ,,"https://drive.google.com/open?id=1tRsHUdoQo5-emetE3KMH3o8WvX2Nrlga, https://drive.google.com/open?id=1PgOBZ9Xn1PApEjvW5uejCaMV6Xzfe81w, https://drive.google.com/open?id=1mmQn1iDf4suvIKE_3PCrwgy9UpmLOM1b, https://drive.google.com/open?id=1pposy9_U2B4K7i3iT8DUEIA_qz7uqCZ1, https://drive.google.com/open?id=1f9aVP1oVwmIto1Bj1Did_cUsO3h_L5ak"
12/16/2025 18:25:58,rusdi,12/16/2025 18:00:00,Pengerjaan gym ,proses pemasangan kabel penerangan,,
12/18/2025 14:46:54,I Komang Artana ,12/18/2025 14:25:00,Delux area,Cat room 595,Enggenering,
12/18/2025 15:08:25,I Komang Artana ,12/18/2025 15:05:00,Genset area,Clean,,
12/18/2025 19:33:49,I Komang Artana ,12/18/2025 19:15:00,Melati area,Clean,,
12/18/2025 19:52:30,I Komang Artana ,12/18/2025 19:25:00,Pool area,Clean,,
12/18/2025 21:23:41,I Komang Artana ,12/18/2025 21:20:00,Loby area ,Clean,,
12/18/2025 21:24:42,I Komang Artana ,12/18/2025 21:24:00,Kitchen,Clean,,
12/18/2025 21:25:30,I Komang Artana ,12/18/2025 21:25:00,Resto,Clean,,
12/20/2025 17:49:09,Iwayan Suardana ,12/20/2025 16:38:00,Gedung lantai 5,Sikon aman ,,"https://drive.google.com/open?id=1iSJrGk4vDE2jETeHLtQgBwq9nOa61Amk, https://drive.google.com/open?id=1BGumNpFVpNnPe2HWLbh-ZY4GDSLGa_4X, https://drive.google.com/open?id=1B2EkB3rYiY1OMODcH3EZs04fLbtKk7IF, https://drive.google.com/open?id=1QQDr4QP0MAeLw-cJLzulekvQxFSAx3No, https://drive.google.com/open?id=1z2oXkxmMItuhzLNlezGM3xplCXo-1OAD"
12/20/2025 20:09:02,Iwayan Suardana ,12/20/2025 19:00:00,Kantin eng loundry HRD office parkiran ,Sikon aman ,,"https://drive.google.com/open?id=16aSNvuYEOKtSFKOXPJPyBrwIW44emjbG, https://drive.google.com/open?id=1DEb37vuUl9em8hb39iDaCkJ3ejMvrdu2, https://drive.google.com/open?id=14BN8wvhxc86sxWXaZ6LFro_FE5Qz_gfh, https://drive.google.com/open?id=1r2cQfqG8XLnMYH69mu9emiDRrygukwZG, https://drive.google.com/open?id=1CU2WKOTUUvwmMb0KJT5RuHAkJ01Drj-W"
12/20/2025 20:12:41,Iwayan Suardana ,12/20/2025 19:30:00,Store Steward kitchen pantry resto ,Sikon aman,,"https://drive.google.com/open?id=18AIzNDU58C4zb7p522vxlCtyhUOd_nIJ, https://drive.google.com/open?id=1kpSGoU2COR5SuN1RFsoabH4mJDM5_VLh, https://drive.google.com/open?id=1YfC1CNsf2ah7fp20jScGdnimn0Gi0OfL, https://drive.google.com/open?id=1C4cOMhQgFGGZNU5kFIBIo5xbfcCHN7gm, https://drive.google.com/open?id=1gMLoxzpfEFrCvBT6ZYFxHocvsLQrRLu_"
12/20/2025 20:16:07,Iwayan Suardana ,12/20/2025 19:45:00,Garden melati ballroom cottage ,Sikon aman ,,"https://drive.google.com/open?id=1r-MA5Gp-gqKQwZ3HAKbvZHf8RXjCJdWL, https://drive.google.com/open?id=12ueDBRHeQN6HHRVA_dh97AAzhOs46E81, https://drive.google.com/open?id=1uu-VQ8sxZ5swSH50o9Yd56IcDpX4BHxo, https://drive.google.com/open?id=1kYKPgtVexkUQZjgrgBXr5CcIhUU2eHEj, https://drive.google.com/open?id=1CwG824HtR-PRpDKkqE5S2qjbu5VuTJUa"
12/20/2025 21:35:22,Iwayan Suardana ,12/20/2025 21:30:00,Lobby parkiran depan lotus cottage pool acces ,Sikon aman ,,"https://drive.google.com/open?id=1sNlbw53odfBP6LJqeUfKk4cHv19oeHoE, https://drive.google.com/open?id=1nZ6SG6PAJpoYHpWUAehIMXnJn2kNtm73, https://drive.google.com/open?id=1NF_zh5vSBnskBPwuxaPJEAleo6gN1Axd, https://drive.google.com/open?id=1COopmrzEP5XZS7CLzfpkWIlCI04ebAkL, https://drive.google.com/open?id=1mZJKTVE-p9HR97ZL-FErAdOV5QfQfITr"
12/22/2025 16:39:07,I Wayan kresna ,12/22/2025 16:33:00,Melati ballroom ,Clean ,Housekeeping,
12/22/2025 16:41:07,I Wayan kresna ,12/22/2025 16:39:00,Koridor area kamar ,Clean ,Housekeeping,
12/22/2025 16:58:25,I Wayan kresna ,12/22/2025 16:56:00,Flamboyan resto ,Clean ,Housekeeping,
12/22/2025 18:16:21,I Wayan kresna ,12/22/2025 18:15:00,Kitchen ,Aman ,,
12/22/2025 18:57:01,I Wayan kresna ,12/22/2025 18:56:00,Lotus cafe ,Clean ,Housekeeping,
12/22/2025 18:57:36,I Wayan kresna ,12/22/2025 18:58:00,Pool baret ,Aman ,,
12/22/2025 19:22:27,I Wayan kresna ,12/22/2025 19:23:00,Loby area ,Clean ,Housekeeping,
12/22/2025 19:23:13,I Wayan kresna ,12/22/2025 19:24:00,Parkiran depan ,Aman ,,
12/23/2025 21:09:47,Naning,12/23/2025 16:10:00,Area Parkir,Tdk ada,,"https://drive.google.com/open?id=19vp272REjukxvkvhhIm7SyiZeaBBQ1Z9, https://drive.google.com/open?id=1MlA1x4pPae9tyc27BfTJmGPayFvEcfKl"
12/23/2025 21:13:04,Naning,12/23/2025 16:15:00,Area kitchen dan flamboyan resto,Tdk ada,,"https://drive.google.com/open?id=1xqqZRwd1vflEAREOkFh-Otx4aDbZe4Xb, https://drive.google.com/open?id=1hfgW2N49ne-ZivKUHLeiTe3KdTdxS1qy, https://drive.google.com/open?id=1zgwdz9Uo7mZEgr-R3FflWJzopiNXXpDq, https://drive.google.com/open?id=1sCR2wXSglX_qvDBadi1FAhdSH5jesKna, https://drive.google.com/open?id=1sywjjjDcgTXVTymusfZiom2XC1xbC-AB"
12/23/2025 21:18:56,Naning,12/23/2025 16:20:00,Area gedung 5lantai,Perenovasian bangunan ,,"https://drive.google.com/open?id=1M9sIctCy7sdBVQ3A1Xo6bEiHDeuyP-Zb, https://drive.google.com/open?id=1_jVPvOI5pXRBP1AEAynRwCrLUHIX-R-7, https://drive.google.com/open?id=1cM93gw43wjQj7lqJjQ1yOwgt_1Q7cW9T, https://drive.google.com/open?id=1cTYZ0FJ3jFfcK9NDzZYGQOKxUSJYw3aO, https://drive.google.com/open?id=1FMpVPQ5QJ4cFHYpSIz7f5kqySaGu8geP"
12/23/2025 21:24:27,Naning ,12/23/2025 16:30:00,Area pool timur dan proyek,Tdk ada,,"https://drive.google.com/open?id=1nzlmul1fOz1kZnj77DGtnG19pgLjKyfu, https://drive.google.com/open?id=1ymM5YPFzY5jCszqNCOjF8FVTK_i_IuYt, https://drive.google.com/open?id=143zx4ewpKTWmLkjwwwA0y8GLCPps3pOK, https://drive.google.com/open?id=1t1hRwXI1ORqzeg4vOJT4fNihZQeb7zo6"
12/23/2025 21:27:49,naning,12/23/2025 16:55:00,Area Pool Barat & Lotus Cafe,Tidak Ada,,"https://drive.google.com/open?id=17YL3pgv9ycTDYzdiAzpdoRhJUHlxGgHN, https://drive.google.com/open?id=129FgVzXkulfeimBX4mT0Ul4V8YjO0s0B, https://drive.google.com/open?id=1iwB4uuXsozcqzM3h3sKaVx7nzPRHx0MU"
12/23/2025 21:29:49,naning,12/23/2025 17:20:00,Area Parkir,tdk ada,,"https://drive.google.com/open?id=11IDz0vEh-wsl_9fkCm6CA3Bff0n2rO1w, https://drive.google.com/open?id=1g_dcPS8khDKTQLLmlQeccw5gbUVAc95j, https://drive.google.com/open?id=1qHp243dzcSsSbzDUu6YAqNxxuwrtts-q, https://drive.google.com/open?id=142B23SQPA1mt1baNdP4ahBNl2xkJOKBr"
12/24/2025 14:15:29,Asrul Sani ,12/24/2025 14:15:00,Cottage pool access,Kontrol kebersihan area kolam dan dpn kamar masih dlm keadaan bersih ,,
12/24/2025 14:45:40,Asrul Sani ,12/24/2025 14:42:00,Deluxe pool access ,"Petugas kolam msh istirahat , area kolam msh byk daun daun nnti sy infokan utk dibersihkan ",,
12/24/2025 18:32:51,Asrul Sani,12/24/2025 18:32:00,Deluxe pool access ,Tamu Kamar 183 sudah dipindahkan ke kamar 166 karena AC dari 183 kurang dingin,,
12/24/2025 19:27:21,Asrul Sani ,12/24/2025 19:27:00,Reception / Lobby,Info dari FO estimasi sekitar 151 kamar,,
12/24/2025 19:42:34,Asrul Sani ,12/24/2025 19:42:00,Edelweis hall,Kontrol settingan YKU NUSRA untuk meeting full day bsok pagi,,
12/24/2025 21:00:57,Asrul Sani ,12/24/2025 21:00:00,Pos security/ Parkiran Utara Lobby,"Keluar masuk kendaraan tamu lancar , security pak Made dan pak Agus stand by , pak Fatah stand by di parkiran belakang",,
12/27/2025 14:29:27,I Komang Artana ,12/27/2025 14:10:00,Delux area,"Rembesan dari dinding koridoor , 419,319,312 dan 270",,"https://drive.google.com/open?id=1KlnUX1GibNpflMNEW6edZtGJXFP0J7LN, https://drive.google.com/open?id=1V_zchY57JSrTZaPJ7HnVTHbJCJo4gNMR"
12/27/2025 15:18:26,I Komang Artana ,12/27/2025 15:20:00,Melati area,Clean,,
12/27/2025 15:48:55,I Komang Artana ,12/27/2025 15:45:00,Genset area,Clean,,
12/27/2025 19:06:02,I Komang Artana ,12/27/2025 17:40:00,Lotus,Clean,,
12/27/2025 19:07:32,I Komang Artana ,12/27/2025 18:05:00,Pool area,Clear up ,FB Service,
12/27/2025 19:08:43,I Komang Artana ,12/27/2025 19:05:00,Kitchen ,Prepare breakfast ,Fb Product,
12/27/2025 19:09:19,I Komang Artana ,12/27/2025 19:08:00,Resto,Clean,,
12/28/2025 8:24:58,Candra,12/28/2025 7:56:00,Parkir karyawan ,No Problem ,,https://drive.google.com/open?id=1Kuh8HF4stfJ6EAWKvofDNEUfHyE725RX
12/28/2025 8:26:20,Candra,12/28/2025 7:57:00,Loker karyawan ,No Problem ,,https://drive.google.com/open?id=1wHUH4KN_mLyrsn4pgApoYjbZNJAPTYzH
12/28/2025 8:27:59,Candra,12/28/2025 7:57:00,Area Laundry,No Problem ,,https://drive.google.com/open?id=1okFyrOglqx2iDz2-kJ_u60RKVnZ5Kkum
12/28/2025 8:29:45,Candra,12/28/2025 8:28:00,Area parkir depan lobby,No problem ,,https://drive.google.com/open?id=13dMuz6Yr0im95jvs4YZ-4vU6NzW47cef
12/28/2025 8:35:04,Candra,12/28/2025 8:33:00,Gerbang samping kamar 111,No Problem ,,https://drive.google.com/open?id=1htsZgu2kxFPTnA3sC9ppv32YeQCxkMOT
12/28/2025 8:36:52,Candra,12/28/2025 8:35:00,Housekeeping ,No Problem ,,https://drive.google.com/open?id=18NReeAfkYeFNYPSZlW33Yai0zvix-ZqU
12/28/2025 8:40:31,Candra,12/28/2025 8:39:00,Restoran Flamboyan ,No problem ,,https://drive.google.com/open?id=1ZZ_4QcLjLpBJwjr079j-m7aEjZvsPhQP
12/28/2025 8:42:45,Candra,12/28/2025 8:41:00,Kitchen ,No problem ,,https://drive.google.com/open?id=1gEm4gd4UVm3TKh9cFOli3_5ZYo_5VImb
12/28/2025 8:56:30,Candra,12/28/2025 8:53:00,Room Deluxe ,No Problem ,,"https://drive.google.com/open?id=1lnD2P_KKzStMp3PaAvoghrjyuTpbXFv4, https://drive.google.com/open?id=1HTnSGfb4wl1UgmzJIqxOEKTJuhSjXBiK, https://drive.google.com/open?id=16ajNRJyOobMLIWgiaOy8_16kEcOVVfAg, https://drive.google.com/open?id=1v5MmuUbGxjk55mdIhoknnsP0D9xK38uS, https://drive.google.com/open?id=1HW54KxeJ_vRB7CqeY-S87dFpWRUKKtYD"
12/28/2025 9:01:49,Candra,12/28/2025 9:01:00,Melati ,Clean,,
12/28/2025 9:02:56,Candra,12/28/2025 9:02:00,Melati ,Clean,,https://drive.google.com/open?id=1j59vd4RsrYrQwswM_tMGYUnpBdBWOm3F
12/28/2025 9:04:36,Candra,12/28/2025 9:03:00,Area genset ,No Problem ,,https://drive.google.com/open?id=1L-hjS4yh5vw6P1RRjAXR2n84D0PwYyGy
12/28/2025 9:08:51,Candra,12/28/2025 9:07:00,Parkir sepeda motor tamu ,No Problem ,,https://drive.google.com/open?id=1at_YUL1D5VMk2xmw8Z7yti3XH1Uo68UW
12/29/2025 14:09:02,i made sardika,12/29/2025 14:07:00,lobby dan area parkir depan ,pengecekan tamu yg cek in dan kondisi parkir tamu ,,
12/29/2025 14:20:54,made sardika,12/29/2025 14:19:00,area cottage pool access dan lotuss cafe,pengecekan kebersihan area pool dan kamar ,,
12/29/2025 14:28:05,made sardika,12/29/2025 14:26:00,"area melati ballroom , resto dan garden  area bungalow","pengecekan kbersihan rrsto,cafe ,musola dan garden belakang",,
12/29/2025 14:38:49,made sardika,12/29/2025 14:38:00,area pool timur dan deluxe pool acsess,pengecekan kebersiahan area kolam dan kamar ,,
12/29/2025 14:47:29,made sardika,12/29/2025 14:46:00,areafloor 2 dluxe room,pengecekan kebersihan koridor dan kamar ,,
12/29/2025 14:53:27,made sardika,12/29/2025 14:52:00,area floor 3 deluxe room ,pengecekan kebersihan di skitar koridor dan kamar yg c/o,,
12/29/2025 15:00:34,made sardika,12/29/2025 14:59:00,floor 4 delexe room,pengecekan kbersiahan area koridor dan kmar ,,
12/29/2025 15:06:36,made sardika,12/29/2025 15:05:00,floor 5 deluxe room,penegecekan kbersihan area kamar dan koridor ,,
12/29/2025 15:14:02,made sardika,12/29/2025 15:12:00,"area scrty blakang ,store,dan parkiran karywan",pngecekan kebersihan area parkir karywan dan pemantauan aktifitas tukang ambil bahan,,
12/29/2025 15:16:56,made sardika,12/29/2025 15:15:00,area kitchn & flamboyab resto,pengecekan kebersiha area kerja dan mengecek preparean untk tamu  breakfast ,,
12/29/2025 16:05:22,made sardika,12/29/2025 16:04:00,area pool barat ,pemantauan aktfifitas pool barat baik tamu cek in dan berenang ,,
12/29/2025 17:11:50,made sardika,12/29/2025 17:10:00,area pool timur dan deluxe pool acss,pemantauan aktfas di pool baik yg berenang dan tamu yg cek in,,
12/29/2025 17:28:16,made sardika,12/29/2025 17:27:00,"area laundry ,teknisi,dan office HRD ","memantau aktfitass di area,,memastikan ac lampu dan komputer dlm kondisi off",,
12/29/2025 18:54:31,made sardika,12/29/2025 18:53:00,area lobby dan lougee,pengecekan kebersihan area lobby dan aktifitas tamubyg cek in,,
12/29/2025 18:57:56,made sardika,12/29/2025 18:56:00,area pos scrty depan dan parkiran tamu,pemantaaun aktifitas parkiran dan area depan  hotel ,,
12/29/2025 19:05:56,made sardika,12/29/2025 19:01:00,area pool timur dan dekuxe pool accss,pemanatauan aktifas tamu yg berenang dan kebersihan area kolam ,,
12/29/2025 19:09:07,made sardika,12/29/2025 19:06:00,area flamboyan resto dan kitcen,mengecek persiapan breakfast baik dari persiapan bahan dan peralatan ,,"https://drive.google.com/open?id=1JI7NGvy4lJGQnJv5w01XwSnxDEpBks9a, https://drive.google.com/open?id=1bUxAORUTa_kRGBaYnR8mzvGvd236_-eu, https://drive.google.com/open?id=1ejMXHsoS8VlY1K8d5WWhg2eEFMUPAj1N, https://drive.google.com/open?id=167Y_9maj-8NakCZm74zTYf_qua7klvpl, https://drive.google.com/open?id=1J6GuBKeVX3EszKBqnQ1vHR_0vafc0qEV"
12/29/2025 19:16:58,made sardika,12/29/2025 19:12:00,"area pool barat ,cottage pool aces dan lotus cafe ",pemantauan aktifitas tamu yg cek in a dan berenang dan kebersihan area kolam dan lotus,,
12/29/2025 19:44:42,made sardika,12/29/2025 19:43:00,area lobby ,membantu proses tamu cek in,,https://drive.google.com/open?id=1-lIW7Yrr3O5zUkfr-1TFsaqN0F1xaeGA
12/29/2025 21:16:52,made sardika ok,12/29/2025 21:12:00,area lobby dan post scrty depan ,pengecekan tamu cek in dan area kebersihan area lobby dan parkir tamu,,
12/29/2025 21:21:13,made sardika,12/29/2025 21:18:00,"area pool timur d,flamboyan resto dan kitchen",pemantauan aktifitas tamu di kolam dan kebersihan resto dan kitchen,,https://drive.google.com/open?id=13MrXedPJP92pTbM6r5AWR-G8-sh7velL
12/29/2025 22:02:23,made sardika,12/29/2025 22:00:00,area parkiran depan dan lobby ,memastikan tamu cek in smua dgn lancar dan parkiran aman terkendali,,https://drive.google.com/open?id=1PltTrcfyqlxCMCAQxZuNYXh0wJhNwcrJ
1/1/2026 9:00:05,made sardika,1/1/2026 8:56:00,area lobby dan parkiran  post scrty depan ,pemantauan kbersihan lobby dan EA tamu hari ini ,,"https://drive.google.com/open?id=1RfWCLYOec1W7Se6-_wdTd_joKmW-y_JW, https://drive.google.com/open?id=1NkW9-vlYg4EPduvnNyS-prgd8hCl8CU_, https://drive.google.com/open?id=1uoXKBBrPoO_LJiLqtsjQKM_ZDnpyG2R0"
1/1/2026 9:07:11,made sardika,1/1/2026 9:04:00,area lotus dan pool cottage acess,pengecekana kbersiahan area pool dan pemantauan tamu yg berenang ,,"https://drive.google.com/open?id=1exn4wxYCr9IlApimYzC8IA7A_lzpwr7K, https://drive.google.com/open?id=1kgcjxv5T6iiTQlAlNQgammsjUZuAW4ka"
1/1/2026 9:17:01,made sardika,1/1/2026 9:14:00,area garden belakang dan melati ballroom,pemantaun aktifitas tamu yg di garden dan kebersihan area garden dan melati ballroom,,"https://drive.google.com/open?id=1yBz6KlXVKov-kjU6lSABnRNFDYwyBuKH, https://drive.google.com/open?id=119h_9KcCmeUHNDgsGSxYUh0bAWyj7ADS"
1/1/2026 9:23:27,made sardika,1/1/2026 9:21:00,area pool timur dan deluxe pool accses,pemantauan aktifitas tamu di area pool dan kbersihan ,,https://drive.google.com/open?id=1h-i3Q4d4MSCgfZ4gxjd_AwaxgQcpapIi
1/1/2026 9:29:55,made sardika,1/1/2026 9:27:00,area flamboyan resto dan kitchen,pemantaauan aktifitas tamu breakfast dan aktifitas di kitchen,,"https://drive.google.com/open?id=1aI6EX4MoW0vTqB59qOuU6IYtGzWoTzli, https://drive.google.com/open?id=1osqcuK9xUvLtmQpIdtQuaf1ybKkhc2QR"
1/1/2026 10:26:28,made sardika,1/1/2026 10:24:00,floor 2 deluxe room,pengecekan kbersihan area koridor dan kamar ,,"https://drive.google.com/open?id=16rRe444i2jLwnnJdWfN8ToLi9ByvMBN3, https://drive.google.com/open?id=1rMw-6-0_K8z7axxEFFUhZ2UMjELqrwgH, https://drive.google.com/open?id=1gGSyicHy9FDj_SDbSSrqc_vJzE0_cHwM"
1/2/2026 14:20:32,Candra,1/2/2026 13:47:00,Parkir sepeda motor karyawan ,Kontainer sampah penuh,Housekeeping,https://drive.google.com/open?id=17-EqJb_HM7QQE2P4nO0Yc0nZOD9nGZFk
1/3/2026 21:55:50,rusdi,1/3/2026 21:54:00,public area,ada beberapa lampu penerangan yang mati dan tertutup dahan pohon sehingga menghalangi sinar lampu butuh di lakukan trimer,,
1/5/2026 14:14:28,Candra,1/5/2026 13:50:00,Parkir sepeda motor karyawan ,Bongkaran proyek sudah mulai penuh,,https://drive.google.com/open?id=1JFTYNrK3EaJwoIGmLNddz40N82BEuX4Y
1/7/2026 1:19:42,defi,1/6/2026 19:19:00,pool barat,clear up piring,FB Service,https://drive.google.com/open?id=1ZOB9FP80VEL0YYyMSKdHvKnH2DJqElUl
1/7/2026 19:33:31,I GD Sukmajaya ,1/7/2026 19:32:00,Poll timur ,Air kolam keruh,Housekeeping,https://drive.google.com/open?id=1CrYjuyhQBc7RZ9ReEEfaaj3u-3j-ipGL
1/11/2026 11:00:05,I Komang Artana ,1/11/2026 10:50:00,Pool akses area,Pergantian kran wastafel 217,Enggenering,https://drive.google.com/open?id=1iX53yPsFQa-hnZZ1g1nJ1IDLOBYD0AL0
1/20/2026 14:12:22,Candra,1/20/2026 13:52:00,Parkir sepeda motor karyawan ,Sampah kontainer penuh,Housekeeping,https://drive.google.com/open?id=1nr1ofpZHQY0gawuIu1NfAKqPxjvpSp81
1/25/2026 8:19:10,Candra,1/25/2026 7:59:00,Area genset ,"Sampah pohon dari Lombok raya penuh, Sehingga kalau ada angin besar terbang ke area parkir Lombok garden",,https://drive.google.com/open?id=1e9WHx1r7nWW09fw4nWTsxgNerV6wbuUR
1/25/2026 8:20:56,Candra,1/25/2026 8:19:00,Area parkir sepeda motor tamu ,Sudah ditemukan kunci sepeda motor tamu Beat putih DK 2338 ACC,Security,https://drive.google.com/open?id=1JlaFyseQ12dC0x_rche_fnwXAgfj5MJx
2/5/2026 15:43:05,I GD Sukmajaya ,2/5/2026 15:41:00,Koridor delax ,Perbaikan keramik pecah depan kamar 274,Enggenering,https://drive.google.com/open?id=1DHKfQz9onydHn8sRXRM6A6DB45P6WcZw
2/5/2026 15:51:01,I GD Sukmajaya ,2/5/2026 15:49:00,Melati ballroom ,Masih dalam perbaikan dinding ,,https://drive.google.com/open?id=1-m4-JbfpUlEMzMfwtKfxqaOW2a9GZr9V
2/8/2026 9:42:18,Candra,2/8/2026 9:41:00,Area Melati,Kotor,Housekeeping,"https://drive.google.com/open?id=1OTmLZwXOxWHm5y1SdowcK30qeCAK128S, https://drive.google.com/open?id=1qLWgJgDY1f-piYbVXDBysTI8mux2QKtX"
2/21/2026 0:20:40,Naning,2/20/2026 17:50:00,Area Building,Bbrp area lobby kotor abu rokok dan bbrp area tangga jg kotor,Housekeeping,"https://drive.google.com/open?id=1bNFvDA1jiNx7gZpALCCb0Brnp7Ry5wQS, https://drive.google.com/open?id=1O962DQ76e8_m1kJc00ryQGgjfzBLOmn5"
3/7/2026 16:18:21,Ayu Sugiyarti,3/7/2026 16:15:00,Garden,Preparation Iftar estimasi 344 paxs ,Fb Product,"https://drive.google.com/open?id=1EthXLmRIYVVvaKvJGI7rZFriGiC7auQr, https://drive.google.com/open?id=1R-Rnehmvpx8_CnBeXgNiw09nPkuqKtYz"
3/7/2026 16:26:52,Ayu Sugiyarti,3/7/2026 16:20:00,Melati Ballroom ,Preparation iftar Alfamart 110 paxs ,FB Service,"https://drive.google.com/open?id=1ZSD-TS4NpBblPxxN09RqEPkFBrZ1P0Sp, https://drive.google.com/open?id=1jFXc3G_uDnzfwBWkl1tk-hLKOPTA_eTr"
3/7/2026 21:28:24,Ayu Sugiyarti,3/7/2026 21:25:00,Lantai 1-5,"Tangga dan koridor perlu diperhatikan kebersihannga karena terlihat kotor, di tembok tangga dari lantai 1 ke 2 sudah mulai lembab",Housekeeping,"https://drive.google.com/open?id=1TwcvQ8oGvOwkd8jEcYlYGwvG9v9L38Qc, https://drive.google.com/open?id=1P6O2ZQSpQepG_exkKr-wE7t_BtmeFDfs"
3/15/2026 11:13:01,made sardika,3/15/2026 11:10:00,area ganzet hote ,pengecekan dan pergantian oli mesin  berkala oleh team  engginering ,Enggenering,"https://drive.google.com/open?id=1a0GhMSr9iDhSmqZH3c18X5htZaS7lnE3, https://drive.google.com/open?id=1LzGdph5lsFzF4LQyzwNjEj6fwilPXDqZ"
3/17/2026 18:40:02,Ayu Sugiyarti,3/17/2026 18:37:00,Flamboyan Resto,"Iftar pindah ke flamboyan resto, tidak ada suara azan dan music",Enggenering,"https://drive.google.com/open?id=1TSddBJ-QKGWixAyKueJHinLZ_V72TIjh, https://drive.google.com/open?id=1akAjtYudnA8QqO7ez4TnAAUl33gi4KU2"
3/26/2026 13:34:16,Candra,3/26/2026 13:33:00,Area restoran Flamboyan ,Tembok jamur,Enggenering,https://drive.google.com/open?id=1cyVA6UjngMWnDXxq9G3MJWNfg6_XAQ54
3/27/2026 17:25:44,Ayu Sugiyarti,3/27/2026 17:24:00,Room 139,"Kamar tidak bisa ditutup kembali, pada saat showing AC tidak bisa dinyalakan",Enggenering,"https://drive.google.com/open?id=1Q-0ww9vJ0v3dNq4KOh5Sjy0Godq2FzZC, https://drive.google.com/open?id=1sOwCVz_XCCc24dDjozIkQfRT0A_kQLdC"
3/27/2026 17:28:37,Ayu Sugiyarti,3/27/2026 17:26:00,Toilet depan mushola dibawah parigata hall,"Air menggenang di lantai toilet, perlu lebih sering dicek utk dibersihkan",Housekeeping,"https://drive.google.com/open?id=1zGf27j9wkjOsr67tjPdjui05Jwh2Fd_r, https://drive.google.com/open?id=1UEP_3Ku5LFxwQqSXiofulO8RWPxfXvnV"
4/3/2026 9:19:18,I Komang Artana ,4/3/2026 9:17:00,Delux aeea,Ganti keramik room 318,Enggenering,https://drive.google.com/open?id=1N0xlvDPlMeGRLYuLYQnqkCMTRcB_b6mz
4/6/2026 18:07:09,Ayu Sugiyarti,4/6/2026 18:05:00,Lantai 1 deluxe ,Tembok di depan lift lantai 1 perlu di cat agar terlihat lebih bersih,Enggenering,https://drive.google.com/open?id=10V_uJrVghu4dLbCCB-CxVIUZGDh5p65M
4/9/2026 21:21:54,Naning,4/9/2026 15:00:00,Area gedung 5 lantai,"area lobby dan  tangga cukup bersih, area langit2 masih bnyk spiderweb nya ",Housekeeping,"https://drive.google.com/open?id=1Kv2Xk4fvrcaSPekXdLWvA-GZfSQTdDPO, https://drive.google.com/open?id=1-m3tHhitt5ULMXnowIVmljDi0rOsq2Mk"
4/16/2026 18:42:59,Ayu Sugiyarti,4/16/2026 18:38:00,Lantai 3 ,"Tembok berjamur dan lembab, lampu koridor kuning sebaiknya diganti putih agar lebih terang",Enggenering,"https://drive.google.com/open?id=1n6u50uG0rvM2rw2M7FD_C2wMlPKL3lLE, https://drive.google.com/open?id=1b0evH8g6Qi4nldCwtNdS48J0IC5Vw9KE"
4/24/2026 19:52:16,Ayu Sugiyarti,4/24/2026 19:50:00,Tembok kamar antara 276 dan 277,Tembok lembab,Enggenering,https://drive.google.com/open?id=1JWm4U4Lz5qy-wh4GYVWgOEseK6lf1wNS
5/6/2026 21:59:40,Ayu Sugiyarti,5/6/2026 21:55:00,Lantai 5,"Kaca perlu dibersikan dari luar, keramik longgar",Housekeeping,"https://drive.google.com/open?id=1gvDgGP4jQfVQd33L8iWzjoez35weGICO, https://drive.google.com/open?id=1MMeeI24um94qDWCI2Y8sPK0vKc2bNHfv"
5/8/2026 18:01:06,Ahmad Mujaddid ,5/8/2026 17:59:00,Melati Ballroom ,Persiapan acara one two trip,Housekeeping,https://drive.google.com/open?id=15ZNB9XwZvS109qWYn2UupXhGgdplgyUW
5/12/2026 16:48:24,I Komang Artana ,5/12/2026 16:47:00,Kitchen,Freezer ganti kompresor,Enggenering,https://drive.google.com/open?id=1NUA4jKFBGLIu_FXATaBpBpTBxX7QqCGQ
5/17/2026 16:07:31,Rusdi,5/17/2026 16:07:00,Kamar 266,Kunci pengaman atau dpuble lock manual pintu ini cukup lama tidak ada,Enggenering,https://drive.google.com/open?id=1fIg5WR5Uzf5BF0uvnEHaVx6KElYW2Q41
5/17/2026 16:45:04,Rusdi,5/17/2026 16:43:00,Kitchen,"Bocor di salah satu kompor kitchen, sdh di cb tangani tetapi belum bisa, sementara tdk di pakai dulu",Enggenering,https://drive.google.com/open?id=12jiAVqNfMC-s6u_nk1KC-W97Kx_Tyhfo
5/26/2026 20:23:46,Ayu Sugiyarti,5/26/2026 20:22:00,Lantai 2,Tembok lembab dan berjamur perlu di cat ulang ,Enggenering,https://drive.google.com/open?id=1pteac3gay1SK22OS7D88W8lUid4XQJ8l
6/7/2026 18:07:32,Ahmad Mujaddid ,6/7/2026 18:05:00,Jalan setapak depan #607 - 610,Proses pengerjaan Batu sikat ,Enggenering,https://drive.google.com/open?id=1Rt7bYZeeFyAKxhaT_UgdZ9UliICohc9d
6/10/2026 21:27:38,Ayu Sugiyarti,6/10/2026 21:26:00,Depan kamar 512,Lantai keramik pecah,Enggenering,https://drive.google.com/open?id=1vSOHBY5VbvrZHSC0DMdww9xobBDSAhD9
6/15/2026 18:29:36,Ayu Sugiyarti,6/15/2026 18:26:00,Lt.5,"Lampu tangga dari lt 4 ke 5 paling redup, perlu dibersihkan kaca dari luar",Enggenering,"https://drive.google.com/open?id=1Sa7vhvIFZJ8UY4pjsMONvEm8K29EfSuw, https://drive.google.com/open?id=1ZjvDHprPia26Wq2m85NL-4Qb-fkJMlup"
6/18/2026 14:17:39,I Komang Artana ,6/18/2026 14:15:00,Toilet alamanda,Pasang jamperan pipa pembuangan ,Enggenering,https://drive.google.com/open?id=1og_OrEDh8C7W3q_Zt8oTNfUVYCA2w8-z
6/26/2026 21:09:35,Ayu Sugiyarti,6/26/2026 21:08:00,Lantai 3 ,Banyak tembok lembab dan jamur harus segera di cat ulang,Enggenering,"https://drive.google.com/open?id=1FAQ5kUsAHIcjc3loWuDk4GE4poHU4EiS, https://drive.google.com/open?id=1DH0T-Z9-de2dqZin94g5kdHbkAQEzeny"
7/8/2026 18:06:28,I Komang Artana ,7/8/2026 18:02:00,Parkiran,Sampah' meluber,Housekeeping,https://drive.google.com/open?id=1y8jxe1kT_p4kQ33hwur6SJEWU7s9WhB5
7/15/2026 20:00:00,Ayu Sugiyarti,7/15/2026 16:02:00,Samping kamar 277,Lembab Jamur perlu dibersihkan,Enggenering,https://drive.google.com/open?id=1emEzbQ3C5pthspyn1allZnCyZsm_hsJP
7/25/2026 15:28:16,Ayu Sugiyarti,7/25/2026 15:00:00,Lantai kolam dpn kamar deluxe,Perlu disikat karena berlumut dan sangat licin bisa berbahaya utk tamu,Housekeeping,https://drive.google.com/open?id=1ZbLygFQCGoicgNtWYoExGyuUTr8REWDP
8/4/2026 19:13:35,Ayu Sugiyarti,8/4/2026 17:00:00,Depan kamar 317,Lembab perlu diperbaiki agar lebih rapi,Enggenering,https://drive.google.com/open?id=11BqXUpcLImFeANTNFMiZoaXAROIsKRzY
8/14/2026 18:23:45,Ayu Sugiyarti,8/14/2026 15:30:00,Kolam renang belakang,Lantai pinggir kolam perlu disikat karena lumat dan licin berbahaya utk tamu,Housekeeping,"https://drive.google.com/open?id=1zgCrSTZoCxmJ8feqsBPoaMVaGxr2ZYM0, https://drive.google.com/open?id=12aWMuhwtIUtEMz_PXvUWJxTwtOiufNxk"
9/3/2026 19:03:04,Ayu Sugiyarti,9/3/2026 17:00:00,Dpn kamar 316,Lembab perlu segera dibersihkan dan dicat ulang,Enggenering,https://drive.google.com/open?id=1wGag2_dFgR9-tm93n4AFCzO_Rx_IHl7p
9/3/2026 19:05:45,Ayu Sugiyarti,9/3/2026 15:00:00,Dpn kamar 417,Perlu segera dipasang keramik karena berbahaya utk tamu yg tidak menggunakan alas kaki/anak anak atau sebaiknya dibuatkan pembatas agar tidak diinjak,Enggenering,https://drive.google.com/open?id=1IhmpbE6wkXDyYnRkk4lHp1IVjmS-YqTo
9/9/2026 21:28:26,I GD Sukmajaya ,9/9/2026 21:26:00,Koridor delax ,Ganti lampu depan #506,Enggenering,
9/11/2026 15:29:28,Iwayan suardana ,9/11/2026 15:26:00,"Resto , pantry , kitchen , steward",Area pantry ada pemasangan keramik dinding,Enggenering,"https://drive.google.com/open?id=1GMDhd7gxpak955-4iCvuhuLxsPj_vXxS, https://drive.google.com/open?id=1xiRjuAir93Weod4rF4fDNmG8zvqeFcnw"
9/14/2026 18:28:38,Ayu Sugiyarti,9/14/2026 18:28:00,Pool dpn kmr deluxe,Lantai perlu disikat karena terlalu licin berbahaya utk tamu,Housekeeping,"https://drive.google.com/open?id=1vb5j0RvYS1AuuL1F1cYMG59SylgW3iAu, https://drive.google.com/open?id=15obYfWCDopE7F_42qncEfplU7IlmICpA"
9/23/2026 21:11:55,Ayu Sugiyarti,9/23/2026 21:10:00,Hydrant setiap lantai,Perlu di cat ulang agar terlihat lebih fresh karena banyak yg sudah karatan,Enggenering,"https://drive.google.com/open?id=1otuPaZZOdmO3h4KVNBf0GX1L3nAVMBxw, https://drive.google.com/open?id=1RJGi8YCneHznSAOoTn3zCf3hZYl4lrnk"
9/29/2026 9:59:50,defi,9/28/2026 13:10:00,melati resto,area kotor dan ada kursi yang patah,Housekeeping,https://drive.google.com/open?id=1m1fs0Aale3XkoP9EVXNH61tcpOTvQjb5
9/30/2026 17:46:14,I Wayan kresna ,9/30/2026 17:45:00,Flamboyan resto ,Clean ,Housekeeping,
9/30/2026 17:47:08,I Wayan kresna ,9/30/2026 17:47:00,Kitchen ,Aman,,
9/30/2026 18:26:09,I Wayan kresna ,9/30/2026 18:25:00,Parkiran depan ,Aman ,Security,
9/30/2026 18:30:54,I Wayan kresna ,9/30/2026 18:30:00,Lotus cafe ,Aman ,,
9/30/2026 18:31:31,I Wayan kresna ,9/30/2026 18:32:00,Pool baret ,Aman ,,
9/30/2026 18:59:41,I Wayan kresna ,9/30/2026 19:00:00,Pool timur ,Aman ,,
9/30/2026 19:00:35,I Wayan kresna ,9/30/2026 19:02:00,Deluxe building area ,Clean ,Housekeeping,
10/1/2026 8:15:30,Iwayan Suardana,10/1/2026 8:00:00,Lobby & Reception,Pengecekan area lobby tamu check-in lancar kondisi aman dan bersih,,
10/1/2026 8:45:12,Iwayan Suardana,10/1/2026 8:30:00,Restoran Flamboyan,Kondisi buffet sarapan bersih dan staf standby,,
10/1/2026 9:15:00,Iwayan Suardana,10/1/2026 9:00:00,Swimming Pool Barat,Air kolam jernih dan area sunbed rapi,,
10/1/2026 10:20:45,Candra,10/1/2026 10:00:00,Deluxe Building Lantai 2,Lampu koridor depan kamar 214 mati perlu penggantian bohlam,Engineering,"https://drive.google.com/open?id=1Sa7vhvIFZJ8UY4pjsMONvEm8K29EfSuw"
10/1/2026 11:05:22,Candra,10/1/2026 10:45:00,Kitchen & Pantry,Kondisi kebersihan kitchen aman dan ventilasi berfungsi normal,,
10/1/2026 14:10:05,I Komang Artana,10/1/2026 14:00:00,Melati Ballroom 1 & 2,Persiapan settingan meeting instansi NTB aman terkendali,,
10/1/2026 16:30:19,Ayu Sugiyarti,10/1/2026 16:15:00,Parkiran Depan & Drop Zone,Arus lalu lintas kendaraan tamu rapi dan aman,,
10/1/2026 19:45:00,I Wayan kresna,10/1/2026 19:30:00,Lotus Cafe & Angkringan,Suasana live music tertib dan area bersih,,
10/2/2026 8:30:00,I GD Sukmajaya,10/2/2026 8:15:00,Genset Hotel,Pengecekan parameter bahan bakar dan voltase genset normal,,
10/2/2026 10:15:33,Ayu Sugiyarti,10/2/2026 10:00:00,Deluxe Building Lantai 3,Handle pintu darurat lantai 3 agak longgar perlu dikencangkan,Engineering,"https://drive.google.com/open?id=1ZjvDHprPia26Wq2m85NL-4Qb-fkJMlup"
10/2/2026 14:20:00,Made Sardika,10/2/2026 14:00:00,Cottage Pool Access,Pengecekan privasi dan kebersihan area kolam cottage aman,,
10/2/2026 16:45:10,Defi,10/2/2026 16:30:00,Gym & Spa,Fasilitas gym bersih dan handuk tamu tertata rapi,,
10/2/2026 20:10:00,Iwayan Suardana,10/2/2026 20:00:00,Swimming Pool Timur,Penerangan kolam timur terang dan kondisi aman,,
10/3/2026 7:45:00,Candra,10/3/2026 7:30:00,Lobby & Reception,Pagi hari tertib briefing pagi staf FO dan security lancar,,
10/3/2026 9:30:15,I Komang Artana,10/3/2026 9:15:00,Garden & Venue Marakesh,Penyiraman tanaman taman tengah dan pembersihan dedaunan selesai,Housekeeping,"https://drive.google.com/open?id=1ZbLygFQCGoicgNtWYoExGyuUTr8REWDP"
10/3/2026 11:20:00,Ayu Sugiyarti,10/3/2026 11:00:00,Deluxe Building Lantai 4,Keramik tepi tangga lantai 4 retak halus perlu perbaikan semen,Engineering,"https://drive.google.com/open?id=1vSOHBY5VbvrZHSC0DMdww9xobBDSAhD9"
10/3/2026 13:50:00,I Wayan kresna,10/3/2026 13:30:00,Restoran Flamboyan,Pembersihan pasca lunch selesai tepat waktu,,
10/3/2026 15:40:00,Ahmad Mujaddid,10/3/2026 15:20:00,Parkir Karyawan & Loker,Pemeriksaan loker karyawan bersih dan tertib security siaga,,`;

export function isDateOnOrAfterOctober2026(dateStr: string): boolean {
  if (!dateStr) return true;
  const clean = dateStr.trim().split(' ')[0];
  if (clean.includes('2025')) return false;

  const parts = clean.split(/[\/\-]/);
  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return y > 2026 || (y === 2026 && m >= 10);
    }
    // D/M/YYYY or M/D/YYYY
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(y)) return true;
    if (y > 2026) return true;
    if (y < 2026) return false;
    // Year 2026: check if either part indicates month >= 10 (October, November, December)
    return p0 >= 10 || p1 >= 10;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return y > 2026 || (y === 2026 && m >= 10);
  }
  return true;
}

export function parseCSVToReports(csv: string): ModReportItem[] {
  const lines = csv.trim().split('\n');
  if (lines.length <= 1) return [];

  const reports: ModReportItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with quoted strings
    const cols: string[] = [];
    let inQuotes = false;
    let current = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === '“' || char === '”') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());

    const timestamp = cols[0] || '';
    const rawName = cols[1] || 'Staff MOD';
    const dateStr = cols[2] || '';
    const location = (cols[3] || 'Area Hotel').replace(/^"|"$/g, '').trim();
    const problem = (cols[4] || 'Sikon aman').replace(/^"|"$/g, '').trim();
    const rawFollowUp = (cols[5] || '').replace(/^"|"$/g, '').trim();
    const rawPictures = (cols[6] || '').replace(/^"|"$/g, '').trim();

    // Enforce data >= October 2026
    const effectiveDate = dateStr || timestamp;
    if (!isDateOnOrAfterOctober2026(effectiveDate)) {
      continue;
    }

    // Clean name
    const officerName = rawName.replace(/\s+/g, ' ').trim();

    // Map department
    let followUpDept: Department = 'None';
    const flLower = rawFollowUp.toLowerCase();
    if (flLower.includes('housekeeping') || flLower.includes('hk')) {
      followUpDept = 'Housekeeping';
    } else if (flLower.includes('eng') || flLower.includes('teknisi')) {
      followUpDept = 'Engineering';
    } else if (flLower.includes('fb service') || flLower.includes('fbs')) {
      followUpDept = 'FB Service';
    } else if (flLower.includes('fb product') || flLower.includes('fbp') || flLower.includes('kitchen')) {
      followUpDept = 'Fb Product';
    } else if (flLower.includes('security') || flLower.includes('scrty')) {
      followUpDept = 'Security';
    } else if (flLower.includes('front office') || flLower.includes('fo') || flLower.includes('reception')) {
      followUpDept = 'Front Office';
    } else if (rawFollowUp) {
      followUpDept = 'General';
    }

    // Determine status & priority
    const probLower = problem.toLowerCase();
    const isSafe = probLower.includes('aman') || 
                  probLower.includes('clean') || 
                  probLower.includes('clear') || 
                  probLower.includes('no problem') || 
                  probLower.includes('tdk ada') || 
                  probLower.includes('tidak ada') ||
                  probLower.includes('kondusif');

    let status: ReportStatus = isSafe ? 'Aman' : 'Perlu Follow Up';
    if (!isSafe && (probLower.includes('sudah') || probLower.includes('selesai') || probLower.includes('ditemukan'))) {
      status = 'Selesai';
    }

    let priority: PriorityLevel = 'Normal';
    if (probLower.includes('pecah') || probLower.includes('bocor') || probLower.includes('mati') || probLower.includes('bahaya') || probLower.includes('karatan') || probLower.includes('patah')) {
      priority = 'Tinggi';
    } else if (isSafe) {
      priority = 'Rendah';
    }

    // Area Grouping
    const locLower = location.toLowerCase();
    let areaGroup = 'Public Area';
    if (locLower.includes('deluxe') || locLower.includes('kamar') || locLower.includes('floor') || locLower.includes('lantai') || locLower.includes('koridor')) {
      areaGroup = 'Deluxe & Rooms';
    } else if (locLower.includes('resto') || locLower.includes('kitchen') || locLower.includes('pantry') || locLower.includes('steward')) {
      areaGroup = 'F&B & Resto';
    } else if (locLower.includes('pool') || locLower.includes('kolam') || locLower.includes('garden')) {
      areaGroup = 'Pool & Garden';
    } else if (locLower.includes('parkir') || locLower.includes('lobby') || locLower.includes('fo')) {
      areaGroup = 'Lobby & Parking';
    } else if (locLower.includes('melati') || locLower.includes('edelweis') || locLower.includes('hall') || locLower.includes('ballroom')) {
      areaGroup = 'Meeting & Ballrooms';
    } else if (locLower.includes('genset') || locLower.includes('laundry') || locLower.includes('loker') || locLower.includes('kantin') || locLower.includes('gudang') || locLower.includes('hrd')) {
      areaGroup = 'Back of House';
    }

    // Extract pictures
    const pictures: PictureItem[] = [];
    if (rawPictures) {
      const urls = rawPictures.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      urls.forEach((url, idx) => {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        const driveId = match ? match[1] : `pic-${i}-${idx}`;
        pictures.push({
          id: `pic-${i}-${idx}`,
          driveUrl: url.startsWith('http') ? url : `https://drive.google.com/open?id=${url}`,
          driveId,
          name: `Bukti_${location.substring(0, 15).replace(/\s+/g, '_')}_${idx + 1}.jpg`,
          originalSizeBytes: 2450000 + (idx * 350000), // ~2.4MB original
          compressedSizeBytes: 135000 + (idx * 25000), // ~135KB compressed (saved 94%)
          compressionRatio: 94,
        });
      });
    }

    // Date & Time extraction
    let datePart = dateStr;
    let timePart = '12:00';
    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      datePart = parts[0];
      timePart = parts[1] || '12:00';
    } else if (timestamp.includes(' ')) {
      const parts = timestamp.split(' ');
      datePart = parts[0];
      timePart = parts[1] || '12:00';
    }

    // Shift based on time
    let shift: ShiftType = 'Sore (15:00 - 23:00)';
    const hour = parseInt(timePart.split(':')[0] || '15', 10);
    if (hour >= 7 && hour < 15) {
      shift = 'Pagi (07:00 - 15:00)';
    } else if (hour >= 15 && hour < 23) {
      shift = 'Sore (15:00 - 23:00)';
    } else {
      shift = 'Malam (23:00 - 07:00)';
    }

    reports.push({
      id: `rep-${i}-${Date.now().toString(36)}`,
      timestamp,
      date: datePart,
      time: timePart,
      officerName,
      location,
      areaGroup,
      problem,
      followUpDept,
      status,
      priority,
      pictures,
      shift,
      synced: true,
      syncedAt: timestamp,
    });
  }

  return reports;
}

export const INITIAL_OFFICERS = [
  'Iwayan Suardana',
  'Candra',
  'I Komang Artana',
  'Defi',
  'Naning',
  'I Wayan kresna',
  'Asrul Sani',
  'Rusdi',
  'I GD Sukmajaya',
  'Made Sardika',
  'Ayu Sugiyarti',
  'Kazwini',
  'Mujahidin',
  'Ahmad Mujaddid'
];

export const HOTEL_DEPARTMENTS: Department[] = [
  'Housekeeping',
  'Engineering',
  'FB Service',
  'Fb Product',
  'Security',
  'Front Office',
  'General'
];

export const HOTEL_LOCATIONS = [
  'Lobby & Reception',
  'Parkiran Depan & Drop Zone',
  'Parkir Karyawan & Loker',
  'Genset Hotel',
  'Restoran Flamboyan',
  'Kitchen & Pantry',
  'Melati Ballroom 1 & 2',
  'Edelweiss Hall',
  'Lotus Cafe & Angkringan',
  'Swimming Pool Barat',
  'Swimming Pool Timur',
  'Deluxe Building Lantai 1',
  'Deluxe Building Lantai 2',
  'Deluxe Building Lantai 3',
  'Deluxe Building Lantai 4',
  'Deluxe Building Lantai 5',
  'Cottage Pool Access',
  'Garden & Venue Marakesh',
  'Gym & Spa',
  'Gudang Samping Kamar 111',
  'Laundry & Ruang Teknisi',
  'Office HRD & Store',
  'Mushola Bawah Parigata Hall'
];
