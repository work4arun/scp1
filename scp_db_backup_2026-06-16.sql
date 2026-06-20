--
-- PostgreSQL database dump
--

\restrict yJbuCsBnzaNEBp0mWgxfBtWHgX6OXN7sbNrerBKp5ZskqSSXrZ48uwcHnBLJgYM

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AppointmentRecurrence; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."AppointmentRecurrence" AS ENUM (
    'NONE',
    'WEEKLY',
    'MONTHLY'
);


ALTER TYPE public."AppointmentRecurrence" OWNER TO scp;

--
-- Name: AppointmentStatus; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."AppointmentStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'REJECTED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public."AppointmentStatus" OWNER TO scp;

--
-- Name: BossInstructionStatus; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."BossInstructionStatus" AS ENUM (
    'CAPTURED',
    'ACTIVATED',
    'PARKED',
    'CLOSED'
);


ALTER TYPE public."BossInstructionStatus" OWNER TO scp;

--
-- Name: InterventionFlag; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."InterventionFlag" AS ENUM (
    'NO',
    'YES',
    'ONLY_IF_DELAYED'
);


ALTER TYPE public."InterventionFlag" OWNER TO scp;

--
-- Name: SystemRole; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."SystemRole" AS ENUM (
    'SUPER_ADMIN',
    'CBO',
    'SM'
);


ALTER TYPE public."SystemRole" OWNER TO scp;

--
-- Name: TaskSource; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."TaskSource" AS ENUM (
    'BOSS_INSTRUCTION',
    'WHATSAPP_GROUP',
    'MANAGEMENT_MEETING',
    'DEPARTMENT_MEETING',
    'MARKETING_REVIEW',
    'MRM',
    'PLACEMENT_REVIEW',
    'RTC_REVIEW',
    'DIGITAL_REVIEW',
    'SELF_STRATEGY',
    'NEW_IDEA'
);


ALTER TYPE public."TaskSource" OWNER TO scp;

--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: scp
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'WAITING_FOR_INPUT',
    'WAITING_FOR_APPROVAL',
    'DELAYED',
    'COMPLETED',
    'PARKED',
    'DROPPED'
);


ALTER TYPE public."TaskStatus" OWNER TO scp;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    agenda text,
    "organizerId" text NOT NULL,
    "attendeeId" text NOT NULL,
    "startAt" timestamp(3) without time zone NOT NULL,
    "endAt" timestamp(3) without time zone NOT NULL,
    location text,
    status public."AppointmentStatus" DEFAULT 'PENDING'::public."AppointmentStatus" NOT NULL,
    recurrence public."AppointmentRecurrence" DEFAULT 'NONE'::public."AppointmentRecurrence" NOT NULL,
    "recurrenceUntil" timestamp(3) without time zone,
    "parentId" text,
    "interventionId" text,
    "taskId" text,
    "verticalId" text,
    outcome text,
    "rejectionReason" text,
    "cancelledReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Appointment" OWNER TO scp;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    after jsonb,
    before jsonb,
    ip text,
    "userAgent" text
);


ALTER TABLE public."AuditLog" OWNER TO scp;

--
-- Name: Availability; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Availability" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dayOfWeek" integer NOT NULL,
    "startMin" integer NOT NULL,
    "endMin" integer NOT NULL,
    label text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Availability" OWNER TO scp;

--
-- Name: BossInstruction; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."BossInstruction" (
    id text NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    instruction text NOT NULL,
    source public."TaskSource" NOT NULL,
    "verticalId" text,
    "capturedById" text NOT NULL,
    status text DEFAULT 'Captured'::text NOT NULL,
    "responseGiven" text,
    "linkedTaskId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "activatedAt" timestamp(3) without time zone,
    state public."BossInstructionStatus" DEFAULT 'CAPTURED'::public."BossInstructionStatus" NOT NULL
);


ALTER TABLE public."BossInstruction" OWNER TO scp;

--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."FeatureFlag" (
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    label text NOT NULL,
    description text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "updatedById" text
);


ALTER TABLE public."FeatureFlag" OWNER TO scp;

--
-- Name: Intervention; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Intervention" (
    id text NOT NULL,
    "taskId" text,
    "verticalId" text,
    issue text NOT NULL,
    "whyNeeded" text NOT NULL,
    "decisionRequired" text NOT NULL,
    deadline timestamp(3) without time zone,
    "noteAttached" boolean DEFAULT false NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    "resolutionNote" text,
    "decisionType" text,
    "snoozedUntil" timestamp(3) without time zone,
    "cboNote" text,
    "raisedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone
);


ALTER TABLE public."Intervention" OWNER TO scp;

--
-- Name: Note; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Note" (
    id text NOT NULL,
    "authorId" text NOT NULL,
    "audienceRole" public."SystemRole" DEFAULT 'SM'::public."SystemRole" NOT NULL,
    text text,
    "audioBytes" bytea,
    "audioMime" text,
    "audioDurationS" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Note" OWNER TO scp;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "recipientId" text NOT NULL,
    "senderId" text,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    "refId" text,
    "seenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO scp;

--
-- Name: OwnerRole; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."OwnerRole" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ownerEmail" text,
    "ownerName" text
);


ALTER TABLE public."OwnerRole" OWNER TO scp;

--
-- Name: ParkingLot; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."ParkingLot" (
    id text NOT NULL,
    idea text NOT NULL,
    "suggestedBy" text NOT NULL,
    "verticalId" text,
    "expectedImpact" text,
    urgency text,
    decision text DEFAULT 'Park'::text NOT NULL,
    "reviewDate" timestamp(3) without time zone,
    remarks text,
    "capturedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ParkingLot" OWNER TO scp;

--
-- Name: Pin; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Pin" (
    id text NOT NULL,
    "userId" text NOT NULL,
    kind text NOT NULL,
    "refId" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Pin" OWNER TO scp;

--
-- Name: Priority; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Priority" (
    id text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    "reviewCadence" text,
    "colorHex" text DEFAULT '#6b7280'::text NOT NULL,
    rank integer NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Priority" OWNER TO scp;

--
-- Name: SubVertical; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."SubVertical" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "verticalId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SubVertical" OWNER TO scp;

--
-- Name: Task; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    "verticalId" text NOT NULL,
    "subVerticalId" text,
    "priorityId" text NOT NULL,
    status public."TaskStatus" DEFAULT 'NOT_STARTED'::public."TaskStatus" NOT NULL,
    source public."TaskSource" DEFAULT 'SELF_STRATEGY'::public."TaskSource" NOT NULL,
    "ownerUserId" text,
    "ownerRoleId" text,
    "createdById" text NOT NULL,
    deadline timestamp(3) without time zone,
    frequency text,
    "supportNeeded" text,
    "delayReason" text,
    "nextAction" text,
    intervention public."InterventionFlag" DEFAULT 'NO'::public."InterventionFlag" NOT NULL,
    "expectedOutput" text,
    "lastUpdateAt" timestamp(3) without time zone,
    "droppedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dropReason" text,
    "slaBreachedAt" timestamp(3) without time zone,
    "slaDueAt" timestamp(3) without time zone,
    "sourceInstructionId" text,
    "sourceParkingId" text,
    "subOwnerId" text
);


ALTER TABLE public."Task" OWNER TO scp;

--
-- Name: TaskUpdate; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."TaskUpdate" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "authorId" text NOT NULL,
    note text NOT NULL,
    "newStatus" public."TaskStatus",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TaskUpdate" OWNER TO scp;

--
-- Name: Timer; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Timer" (
    id text NOT NULL,
    "userId" text NOT NULL,
    label text,
    "fireAt" timestamp(3) without time zone NOT NULL,
    sent boolean DEFAULT false NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Timer" OWNER TO scp;

--
-- Name: User; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    "systemRole" public."SystemRole" NOT NULL,
    "ownerRoleId" text,
    active boolean DEFAULT true NOT NULL,
    "lastSeenAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO scp;

--
-- Name: Vertical; Type: TABLE; Schema: public; Owner: scp
--

CREATE TABLE public."Vertical" (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    "colorHex" text DEFAULT '#4f46e5'::text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vertical" OWNER TO scp;

--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Appointment" (id, title, description, agenda, "organizerId", "attendeeId", "startAt", "endAt", location, status, recurrence, "recurrenceUntil", "parentId", "interventionId", "taskId", "verticalId", outcome, "rejectionReason", "cancelledReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."AuditLog" (id, "userId", action, entity, "entityId", note, "createdAt", after, before, ip, "userAgent") FROM stdin;
cmokythuj00016gwxuvljcabq	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmoj2remi000rxk85875wfzaz	Set owner contact for AIC Lead: Mr. Pradeepraj <pradeepraj@aicraise.com>	2026-04-30 04:09:52.795	\N	\N	\N	\N
cmokyz0m700086gwxt7lztu6f	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokyz0lj00056gwx44561j9c	Created RGU-016	2026-04-30 04:14:10.399	\N	\N	\N	\N
cmokz3apa000i6gwx545kd8mi	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokz3aos000f6gwxkkqpf8lv	Created MKT-043	2026-04-30 04:17:30.094	\N	\N	\N	\N
cmokzbpvf000654jtqswc2gr0	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzbpus000354jtun9oyqyw	Created MKT-044	2026-04-30 04:24:03.003	\N	\N	\N	\N
cmokzhm2l000c54jtd79e00uh	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzhm2c000954jt2as9x713	Created MKT-045	2026-04-30 04:28:38.013	\N	\N	\N	\N
cmokzkqfd000i54jtbetm3z7p	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzkqep000f54jt9bba10eo	Created MKT-046	2026-04-30 04:31:03.625	\N	\N	\N	\N
cmokzm8km000o54jt0qqfsc1l	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzm8k6000l54jtfzogvob3	Created MKT-047	2026-04-30 04:32:13.798	\N	\N	\N	\N
cmokznkcb000u54jt2m6rro3n	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokznkc3000r54jt1xfx3gn3	Created MKT-048	2026-04-30 04:33:15.707	\N	\N	\N	\N
cmokzr260001054jtbrqjgvu3	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzr25m000x54jtgb0hyjov	Created RGU-017	2026-04-30 04:35:58.777	\N	\N	\N	\N
cmokzshtm001654jt0f8l4u94	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzshsf001354jtd0pmqgwl	Created RGU-018	2026-04-30 04:37:05.721	\N	\N	\N	\N
cmokzuezg001c54jtbv47c3sz	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzuevx001954jtdct4b9ot	Created MKT-049	2026-04-30 04:38:35.353	\N	\N	\N	\N
cmokzwsm8001i54jt5lqkrqx3	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmokzwsjv001f54jt5w5et3uh	Created RGU-019	2026-04-30 04:40:26.335	\N	\N	\N	\N
cmol033z30005lltvbcdyrk5a	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol033xy0002lltvxk4mdt5g	Created MKT-050	2026-04-30 04:45:20.991	\N	\N	\N	\N
cmol04e3g000blltvcawqhw8h	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol04e340008lltvpm473qod	Created MKT-051	2026-04-30 04:46:20.764	\N	\N	\N	\N
cmol06fkq000klltvq6prjrjg	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol06fki000hlltv11tjdlse	Created MKT-052	2026-04-30 04:47:55.995	\N	\N	\N	\N
cmol06rfc000qlltvexnqskw6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol06rf2000nlltv4xh76si4	Created MKT-053	2026-04-30 04:48:11.352	\N	\N	\N	\N
cmol07et9000wlltvoclzqcj8	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol07esr000tlltvqyfe4tg3	Created MKT-054	2026-04-30 04:48:41.661	\N	\N	\N	\N
cmol07su20012lltvrulbxri0	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol07stu000zlltv5nmnrjwv	Created MKT-055	2026-04-30 04:48:59.834	\N	\N	\N	\N
cmol085010018lltvyckoy3sh	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol084zs0015lltv4zmr0xjs	Created MKT-056	2026-04-30 04:49:15.601	\N	\N	\N	\N
cmol08emx001elltvsk9key43	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol08emp001blltv3bod4x30	Created MKT-057	2026-04-30 04:49:28.089	\N	\N	\N	\N
cmol08vur001klltvjvsr4i7g	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol08vuj001hlltvfoy03mnn	Created MKT-058	2026-04-30 04:49:50.403	\N	\N	\N	\N
cmol098nb001qlltv23eqfd0u	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol098n3001nlltvlhm9wq3q	Created MKT-059	2026-04-30 04:50:06.983	\N	\N	\N	\N
cmol0kdfp001zlltvajd22xk6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0kdf3001wlltvu4o07lfs	Created RGU-020	2026-04-30 04:58:46.405	\N	\N	\N	\N
cmol0lvgf0027lltv5fpygjj5	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0lvg60024lltvu09l47i0	Created RGU-021	2026-04-30 04:59:56.415	\N	\N	\N	\N
cmol0mjat002flltvhk34pa0h	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0mjal002clltv30convoz	Created RGU-022	2026-04-30 05:00:27.317	\N	\N	\N	\N
cmol0nan6002nlltvp5tem4su	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0namz002klltv53v7voiu	Created RGU-023	2026-04-30 05:01:02.754	\N	\N	\N	\N
cmol0ozaj002vlltvxsl2685h	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0ozaa002slltvl985mqwz	Created RGU-024	2026-04-30 05:02:21.356	\N	\N	\N	\N
cmol0q5de0033lltvh83utf1i	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0q5d60030lltvu45rxwgm	Created MKT-060	2026-04-30 05:03:15.89	\N	\N	\N	\N
cmol0rkfv003blltv3jy0wqqx	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0rkf80038lltvh9l0izwv	Created RGU-025	2026-04-30 05:04:22.075	\N	\N	\N	\N
cmol0sax3003hlltv2094rda0	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0sawt003elltvjks06c8c	Created RGU-026	2026-04-30 05:04:56.391	\N	\N	\N	\N
cmol0tbtm003nlltvslkq009w	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0tbtd003klltvlqk9t6ab	Created RGU-027	2026-04-30 05:05:44.219	\N	\N	\N	\N
cmol0ur9l003ylltv9qswmnfm	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0ur96003vlltvwgpsga8u	Created RGU-028	2026-04-30 05:06:50.89	\N	\N	\N	\N
cmol0vbzt0046lltvjzgbb633	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0vbzl0043lltvf64fhdzs	Created RGU-029	2026-04-30 05:07:17.754	\N	\N	\N	\N
cmol0wjc4004elltv8xg4inp4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0wjbw004blltvgwksns1y	Created RGU-030	2026-04-30 05:08:13.924	\N	\N	\N	\N
cmol0xq5v004mlltvli1zlve6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0xq5f004jlltvn0f6ah0l	Created RGU-031	2026-04-30 05:09:09.428	\N	\N	\N	\N
cmol0y69o004slltvckwyu7ni	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0y697004plltveig2mw0j	Created RGU-032	2026-04-30 05:09:30.301	\N	\N	\N	\N
cmol0zhrl0050lltvqkm1xkbj	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol0zhra004xlltvdsx00o5o	Created RGU-033	2026-04-30 05:10:31.857	\N	\N	\N	\N
cmol100uv0058lltv4ewrh9fd	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol100un0055lltvr783b2hg	Created RGU-034	2026-04-30 05:10:56.599	\N	\N	\N	\N
cmol10diq005elltvpkt4tnum	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol10dij005blltv0kazatah	Created RGU-035	2026-04-30 05:11:13.011	\N	\N	\N	\N
cmol10tuk005klltv5k8ila42	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol10tub005hlltv7axlxwze	Created RGU-036	2026-04-30 05:11:34.172	\N	\N	\N	\N
cmol118hc005qlltv9chiypuy	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol118h5005nlltvbyzbaqbm	Created RGU-037	2026-04-30 05:11:53.136	\N	\N	\N	\N
cmol13mf1005wlltvvmdsehr1	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol13mem005tlltvw9p6cjar	Created RGU-038	2026-04-30 05:13:44.509	\N	\N	\N	\N
cmol151nj0062lltv7m3mwqms	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol151n3005zlltvsrj80evq	Created RGU-039	2026-04-30 05:14:50.912	\N	\N	\N	\N
cmol15ek20068lltvo0hkh2hd	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol15ejs0065lltv9xgpay3p	Created RGU-040	2026-04-30 05:15:07.634	\N	\N	\N	\N
cmol162uo006elltvjdl6tu0r	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol162tr006blltve6vh3d4f	Created RGU-041	2026-04-30 05:15:39.12	\N	\N	\N	\N
cmol17wda006nlltvawh2rboo	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol17wd3006klltvk73gxk83	Created RGU-042	2026-04-30 05:17:04.031	\N	\N	\N	\N
cmol1aflb006tlltv58j85ddi	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1afkx006qlltvfobd3p8u	Created RGU-043	2026-04-30 05:19:02.255	\N	\N	\N	\N
cmol1av3v006zlltvcb3cgr7z	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1av3m006wlltvnfz82z5d	Created RGU-044	2026-04-30 05:19:22.363	\N	\N	\N	\N
cmol1b6cc0075lltv4d7iw4os	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1b6c40072lltvm7ukd234	Created RGU-045	2026-04-30 05:19:36.924	\N	\N	\N	\N
cmol1bjhn007blltvef255ie8	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1bjh60078lltv86c6lih9	Created RGU-046	2026-04-30 05:19:53.964	\N	\N	\N	\N
cmol1btgs007hlltvktjpitqq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1btgh007elltvridj5ut5	Created RGU-047	2026-04-30 05:20:06.893	\N	\N	\N	\N
cmol1c9gg007nlltvky8zi89h	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1c9fj007klltv9uci9ey6	Created RGU-048	2026-04-30 05:20:27.616	\N	\N	\N	\N
cmol1cpxp007tlltv1bq1u8lc	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol1cpxh007qlltva536ro2m	Created RGU-049	2026-04-30 05:20:48.973	\N	\N	\N	\N
cmol467zo008hlltvn3lyrj74	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol467yz008elltvjj75mv3k	Created MKT-061	2026-04-30 06:39:44.629	\N	\N	\N	\N
cmol4k5y0008ulltvopg8oa1w	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol4k5xn008rlltv2ohqwnw3	Created MKT-062	2026-04-30 06:50:35.16	\N	\N	\N	\N
cmol4kulj0090lltvkmrb7n1c	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmol4kulc008xlltv54vb97a6	Created MKT-063	2026-04-30 06:51:07.112	\N	\N	\N	\N
cmol5syk1009alltvut0y63bd	cmoj2rf13002xxk85dachrvmn	task.drop	Task	cmojmehr10003p2zxmb92v3uv	DUPLICATE	2026-04-30 07:25:25.104	\N	\N	\N	\N
cmol6xe5q009flltvnhwk9gsw	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmol6xe3q009dlltva235e6ag	CRT — Creative	2026-04-30 07:56:51.563	\N	\N	\N	\N
cmol8ngyz00015tvmrlxp1ksi	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmol7gok30000p7acsvg1jgh1	Set owner contact for RGU Computing: Dr. Arunkumar K <dean.rsmart@rathinam.in>	2026-04-30 08:45:07.883	\N	\N	\N	\N
cmol8qcks00035tvm5j1wzg8e	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmoj2relu000jxk85u14s3336	Set owner contact for Student Affairs: Mr. Jimry Hendry <jimryhenry@rathinam.in>	2026-04-30 08:47:22.156	\N	\N	\N	\N
cmol93v9300055tvm45jasf7y	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmoj2rejx0003xk85byy6yh6g	Set owner contact for Admission Manager: Mr. Pandi Elavarasan <pandielavarasan@rathinam.in>	2026-04-30 08:57:52.887	\N	\N	\N	\N
cmol955ud00075tvmfftiubji	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmoj2ren5000zxk85h56yuj2n	Set owner contact for Dr. BN: D. B Nagaraj <cbo@rathinam.in>	2026-04-30 08:58:53.269	\N	\N	\N	\N
cmol97fei00095tvmw62n1i3h	cmoj2reur002txk85m6ya4byh	role.contact_set	OwnerRole	cmokyytb800026gwx5ma2df9y	Set owner contact for RCAS CSE: Dr. Arunkumar K <dean.rsmart@rathinam.in>	2026-04-30 09:00:38.971	\N	\N	\N	\N
cmoqp5pt4000l5tvmi6pxpuq8	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqp5ps0000i5tvmjw33bt46	Created MKT-064	2026-05-04 04:26:03.88	\N	\N	\N	\N
cmoqp6xco000r5tvmdqvxeumf	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqp6xce000o5tvmkebvt656	Created MKT-065	2026-05-04 04:27:00.313	\N	\N	\N	\N
cmoqp77wx000x5tvm2xgpq5t2	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqp77wq000u5tvm2k2xey51	Created MKT-066	2026-05-04 04:27:14.002	\N	\N	\N	\N
cmoqp9z0000135tvms1nug1mo	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqp9yyn00105tvmst9mr9ub	Created MKT-067	2026-05-04 04:29:22.416	\N	\N	\N	\N
cmoqpaorx00195tvm67pqwb3i	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqpaore00165tvmaw2fu975	Created MKT-068	2026-05-04 04:29:55.822	\N	\N	\N	\N
cmoqpf4gm001f5tvmwt6exxyc	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqpf4g4001c5tvmfc4k88iv	Created MKT-069	2026-05-04 04:33:22.774	\N	\N	\N	\N
cmoqpflsg001l5tvms38v206u	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqpfls7001i5tvmcgy4wbk5	Created MKT-070	2026-05-04 04:33:45.232	\N	\N	\N	\N
cmoqpg5mr001r5tvm0zw958wi	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqpg5mh001o5tvmzzkrw3on	Created MKT-071	2026-05-04 04:34:10.947	\N	\N	\N	\N
cmoqpgpk4001x5tvmvm6gf3pf	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqpgpjv001u5tvm94k2ckn2	Created MKT-072	2026-05-04 04:34:36.772	\N	\N	\N	\N
cmoqph70i00235tvm7im90byd	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmoqph70000205tvm939y1q0b	Created MKT-073	2026-05-04 04:34:59.394	\N	\N	\N	\N
cmoxx53bj002h5tvmb2e9ipqq	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxx53ba002f5tvm8aotskxe	QSCAI — Quantum Science, Computing & AI	2026-05-09 05:43:54.894	\N	\N	\N	\N
cmoxx6y6u002k5tvmjn0sys9k	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxx6y6r002i5tvmi9gve1y0	EET — Engineering & Emerging Technologies	2026-05-09 05:45:21.558	\N	\N	\N	\N
cmoxxgtur002n5tvmxac48o7d	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxgtum002l5tvmqd8j7b9q	BCOM — Business & Commerce	2026-05-09 05:53:02.499	\N	\N	\N	\N
cmoxxlm1a002p5tvmurpkgdsz	cmoj2reur002txk85m6ya4byh	vertical.update	Vertical	cmoxx6y6r002i5tvmi9gve1y0	Engineering & Emerging Technologies	2026-05-09 05:56:45.647	\N	\N	\N	\N
cmoxxlpru002r5tvmrjjchy35	cmoj2reur002txk85m6ya4byh	vertical.update	Vertical	cmoxx6y6r002i5tvmi9gve1y0	Engineering & Emerging Technologies	2026-05-09 05:56:50.491	\N	\N	\N	\N
cmoxxn71n002u5tvmgm39oufm	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxn71k002s5tvmkhszbqxk	ABFAT — Applied Biosciences, Food & Agri-Tech	2026-05-09 05:57:59.531	\N	\N	\N	\N
cmoxxqws5002x5tvmrj33brla	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxqws1002v5tvm4285bxdu	LAS — Liberal Arts & Science	2026-05-09 06:00:52.853	\N	\N	\N	\N
cmoxxs64o00305tvm052iyhx0	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxs64l002y5tvm69ga2uj6	FDMPA — Fashion Design, Media & Performing Arts	2026-05-09 06:01:51.624	\N	\N	\N	\N
cmoxxt9f200335tvm8ikxsrah	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxt9f000315tvm4av2owtl	SCS — Sustainability & Climate Studies	2026-05-09 06:02:42.543	\N	\N	\N	\N
cmoxxu1of00365tvmet72jfpx	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxxu1od00345tvm18okxdox	SHS — Sports & Health Sciences	2026-05-09 06:03:19.168	\N	\N	\N	\N
cmoxy29hb00395tvm55v386pw	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmoxy29h700375tvmbr0bhywf	REG — Registrar	2026-05-09 06:09:42.528	\N	\N	\N	\N
cmp3mbnye003f5tvm87f0oqon	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmp3mbnx8003c5tvma6wxrd37	Created MKT-074	2026-05-13 05:27:42.854	\N	\N	\N	\N
cmpdkpnh600435tvmfxr4eebq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpdkpnfm00405tvm42qk2ry6	Created FDMPA-001	2026-05-20 04:40:17.945	\N	\N	\N	\N
cmpezor0s002nuycd0drtz7k5	cmoj2rf13002xxk85dachrvmn	task.delete	Task	cmol1b6c40072lltvm7ukd234	\N	2026-05-21 04:27:16.301	\N	\N	\N	\N
cmpf9jmw70007zj6s13i5nc9m	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpf9jmvi0002zj6s9wk6za3r	Created RGU-050	2026-05-21 09:03:13.831	\N	\N	\N	\N
cmpf9tmc3000fzj6ssv4o6kui	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpf9tmbj000azj6sg179zznl	Created RGU-051	2026-05-21 09:10:59.667	\N	\N	\N	\N
cmpfa2ob8000nzj6sd9enms3s	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfa2oat000izj6s6p58dzvq	Created RGU-052	2026-05-21 09:18:02.132	\N	\N	\N	\N
cmpfa4y49000vzj6sks6qzfwb	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfa4y3z000qzj6sjx7ty4bu	Created REG-001	2026-05-21 09:19:48.153	\N	\N	\N	\N
cmpfacadg0016zj6swzy92kkp	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfacacy0011zj6s66ij16ka	Created RGU-053	2026-05-21 09:25:30.629	\N	\N	\N	\N
cmpfaege0001ezj6sdtx4rrly	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfaegdo0019zj6sn12qsnio	Created RGU-054	2026-05-21 09:27:11.736	\N	\N	\N	\N
cmpfafdfr001pzj6swgk1bbgl	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfafdfh001kzj6siu3h74vj	Created RGU-055	2026-05-21 09:27:54.567	\N	\N	\N	\N
cmpfaga3r0020zj6slmx65qc6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfaga3h001vzj6sdvytoluj	Created RGU-056	2026-05-21 09:28:36.903	\N	\N	\N	\N
cmpfah9ma002bzj6si29g196d	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfah9m10026zj6st3ss4wnd	Created RGU-057	2026-05-21 09:29:22.93	\N	\N	\N	\N
cmpfai43b002mzj6s1kup6rk1	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfai432002hzj6sqi6tnypw	Created RGU-058	2026-05-21 09:30:02.424	\N	\N	\N	\N
cmpfaizcc002xzj6sxb7ccb4f	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfaizbs002szj6s4b9a2bnt	Created RGU-059	2026-05-21 09:30:42.924	\N	\N	\N	\N
cmpfak7c90038zj6siharxq7o	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfak7bx0033zj6sqzxymmad	Created RGU-060	2026-05-21 09:31:39.945	\N	\N	\N	\N
cmpfal5gh003jzj6sui4cu6g4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfal5g6003ezj6shbl1fc0j	Created RGU-061	2026-05-21 09:32:24.162	\N	\N	\N	\N
cmpfbvur6003uzj6sekjrpi7q	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfbvuqj003pzj6sjlpsmy1v	Created RGU-062	2026-05-21 10:08:43.122	\N	\N	\N	\N
cmpfbz7de0045zj6ss4rjatwq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfbz7d40040zj6siu2i1c96	Created CRT-040	2026-05-21 10:11:19.442	\N	\N	\N	\N
cmpfbzzki004gzj6skfyrva3m	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfbzzk9004bzj6swpsiqka4	Created CRT-041	2026-05-21 10:11:55.987	\N	\N	\N	\N
cmpfc0xrt004rzj6s7xabku60	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfc0xqj004mzj6sahnyt67u	Created CRT-042	2026-05-21 10:12:40.313	\N	\N	\N	\N
cmpfc1oe90052zj6sb4bk4hmc	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfc1ody004xzj6s7ryw72px	Created CRT-043	2026-05-21 10:13:14.817	\N	\N	\N	\N
cmpfc2buj005dzj6sc79bkwcr	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfc2bu10058zj6s064iho1n	Created CRT-044	2026-05-21 10:13:45.211	\N	\N	\N	\N
cmpfc71i9005ozj6scmqlythl	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfc71hy005jzj6scsls5rev	Created CRT-045	2026-05-21 10:17:25.089	\N	\N	\N	\N
cmpfca0570061zj6sl4cu3cx9	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfca04o005wzj6shjgigi7b	Created CRT-046	2026-05-21 10:19:43.291	\N	\N	\N	\N
cmpfcaugn006czj6s6twznkrq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfcaugd0067zj6sqe5iq5qh	Created CRT-047	2026-05-21 10:20:22.584	\N	\N	\N	\N
cmpfceg3r006nzj6sxednechi	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfceg3g006izj6s2sgk43p6	Created CRT-048	2026-05-21 10:23:10.599	\N	\N	\N	\N
cmpfcf0ss006yzj6swny6zqjl	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfcf0sj006tzj6seumx3m7g	Created CRT-049	2026-05-21 10:23:37.421	\N	\N	\N	\N
cmpfcflgi0079zj6s1hhpd3zg	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfcflg90074zj6slbd41xqb	Created CRT-050	2026-05-21 10:24:04.195	\N	\N	\N	\N
cmpfci8ll007mzj6svb9iht2s	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfci8l4007hzj6s43khnz5e	Created CRT-051	2026-05-21 10:26:07.497	\N	\N	\N	\N
cmpfcosem007xzj6spxtqzrat	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfcose3007szj6sqfa9w92a	Created RGU-063	2026-05-21 10:31:13.102	\N	\N	\N	\N
cmpfcwl050088zj6swes67ovo	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfcwkzl0083zj6syid80ji3	Created RGU-064	2026-05-21 10:37:16.757	\N	\N	\N	\N
cmpfet8if008jzj6s4m8ms58z	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpfet8hv008ezj6ss9vbk6ms	Created RTC-016	2026-05-21 11:30:39.831	\N	\N	\N	\N
cmpgjtvbt0007s5db32zovd10	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpgjtvb10002s5db01b4ovs5	Created RTC-017	2026-05-22 06:38:53.658	\N	\N	\N	\N
cmphutip40007pua117exmncx	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmphutio60002pua1o97gj4or	Created MKT-075	2026-05-23 04:34:19.24	\N	\N	\N	\N
cmphuxaha000fpua1dt7w6kqt	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmphuxagz000apua17ulbl6vy	Created MKT-076	2026-05-23 04:37:15.214	\N	\N	\N	\N
cmphv0uz7000npua12gkl9f5c	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmphv0uym000ipua1oq8ukdpv	Created MKT-077	2026-05-23 04:40:01.747	\N	\N	\N	\N
cmphv300j000vpua19cbtz6s5	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmphv3006000qpua11czbfvsn	Created RGU-065	2026-05-23 04:41:41.587	\N	\N	\N	\N
cmphv4dlp0013pua1glv15ien	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmphv4dle000ypua174r31sda	Created MKT-078	2026-05-23 04:42:45.853	\N	\N	\N	\N
cmpkqiwdy000gqefwgj10gpej	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpkqiwda000bqefw7kjjtp6d	Created MKT-079	2026-05-25 04:57:23.83	\N	\N	\N	\N
cmpkqsfze001dqefwkyg1abzw	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpkqsfyr0018qefwnqsa8a2c	Created MKT-080	2026-05-25 05:04:49.13	\N	\N	\N	\N
cmpkr3n97001rqefw2ustehvo	cmoj2rf13002xxk85dachrvmn	role.contact_set	OwnerRole	cmoj2rejx0003xk85byy6yh6g	Set owner contact for Admission Manager: Mr. Pandi Elavarasan <pandielavarasan@rathinam.in>	2026-05-25 05:13:31.771	\N	\N	\N	\N
cmpkv1f250002113wwaijbpy5	cmoj2rf13002xxk85dachrvmn	role.contact_set	OwnerRole	cmpkuzvfo0000113wydfe7xak	Set owner contact for Team Leader: udhayaprakash.rtc@rathinam.in	2026-05-25 07:03:46.302	\N	\N	\N	\N
cmpnldnkq000qo3hnd7eord74	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpnldm02000lo3hn4chmma33	Created MKT-081	2026-05-27 04:56:39.579	\N	\N	\N	\N
cmpnlg6gt000yo3hn5s4adx44	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpnlg6gb000to3hnewn024ck	Created MKT-082	2026-05-27 04:58:37.373	\N	\N	\N	\N
cmprxwovk0017o3hnltq4qcs3	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmprxwnx20012o3hnb5m39hy7	Created MKT-083	2026-05-30 05:58:27.824	\N	\N	\N	\N
cmpry4jij001fo3hn7xbqa5k4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpry4i0f001ao3hnutxvgk18	Created MKT-084	2026-05-30 06:04:34.123	\N	\N	\N	\N
cmpryjdmg001no3hnqsc978iw	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryjcoj001io3hn8v7n13dn	Created MKT-085	2026-05-30 06:16:06.328	\N	\N	\N	\N
cmprykund001vo3hnqhxasl1d	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmprykt7x001qo3hn8p7h4nww	Created MKT-086	2026-05-30 06:17:15.049	\N	\N	\N	\N
cmprymctd0023o3hna5vgbe5d	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmprymbb3001yo3hn22w5etc7	Created MKT-087	2026-05-30 06:18:25.249	\N	\N	\N	\N
cmpryn7fw002bo3hngji6cza5	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryn6hw0026o3hn5hxdebwc	Created MKT-088	2026-05-30 06:19:04.941	\N	\N	\N	\N
cmpryo6ey002jo3hn72zgo3bq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryo5fv002eo3hnxrep0wy8	Created MKT-089	2026-05-30 06:19:50.266	\N	\N	\N	\N
cmpryp0r1002ro3hnq0tkjwc3	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryoz9f002mo3hnnaxdgaih	Created MKT-090	2026-05-30 06:20:29.581	\N	\N	\N	\N
cmpryqfz10032o3hn92qiqre7	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryqf1j002xo3hnuce4cxme	Created MKT-091	2026-05-30 06:21:35.965	\N	\N	\N	\N
cmpryrm9c003ao3hnril522rt	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryrktn0035o3hnf705olzi	Created MKT-092	2026-05-30 06:22:30.769	\N	\N	\N	\N
cmpryspsz003io3hnbm4hz7ei	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmprysoa8003do3hn48t4lij2	Created MKT-093	2026-05-30 06:23:22.019	\N	\N	\N	\N
cmpryuhr3003qo3hn64d8o03o	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryugsw003lo3hntfyj7ovp	Created MKT-094	2026-05-30 06:24:44.895	\N	\N	\N	\N
cmprywfxj003yo3hnrrktq8zh	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryweht003to3hnyf1frf4e	Created MKT-095	2026-05-30 06:26:15.848	\N	\N	\N	\N
cmpryx80h0046o3hnazty2b5v	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpryx73h0041o3hnkstx56ae	Created MKT-096	2026-05-30 06:26:52.241	\N	\N	\N	\N
cmps0mymh0002heomti1erluk	cmoj2rf13002xxk85dachrvmn	role.contact_set	OwnerRole	cmps0mij40000heomw8mvsun3	Set owner contact for RAALE: Dr. R. Arunkumar <rarunkumar@rathinam.in>	2026-05-30 07:14:52.746	\N	\N	\N	\N
cmps0oofc0005heom6w3vmlcw	cmoj2rf13002xxk85dachrvmn	vertical.create	Vertical	cmps0oof80003heomf5urdcuh	RAALE — Learning Ecosystem	2026-05-30 07:16:12.841	\N	\N	\N	\N
cmps0ozhj0007heomnfbcw8gw	cmoj2rf13002xxk85dachrvmn	vertical.update	Vertical	cmps0oof80003heomf5urdcuh	RAALE - Learning Ecosystem	2026-05-30 07:16:27.176	\N	\N	\N	\N
cmps0qeeh000fheom20v30a5z	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmps0qedw000aheomdt7pzse0	Created RAALE-001	2026-05-30 07:17:33.161	\N	\N	\N	\N
cmps49omy0001xu75eeqbtcjv	cmoj2rf13002xxk85dachrvmn	task.delete	Task	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 08:56:31.738	\N	\N	\N	\N
cmpsjsymp00072qldp2lyqlq7	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpsjsyl300022qlda9e5b8sf	Created RAALE-001	2026-05-30 16:11:25.393	\N	\N	\N	\N
cmpsozcza000lp8dtk8o1d7lu	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpsozbkq000gp8dt5fskv8i3	Created RAALE-002	2026-05-30 18:36:22.007	\N	\N	\N	\N
cmpuqudjp0018p8dtjvhn28gk	cmoj2rf13002xxk85dachrvmn	task.delete	Task	cmpsjsyl300022qlda9e5b8sf	\N	2026-06-01 05:04:01.045	\N	\N	\N	\N
cmpuqw8a0001gp8dt0a4vtmoe	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpuqw899001bp8dtudtx5te2	Created PLC-009	2026-06-01 05:05:27.529	\N	\N	\N	\N
cmpurcb7p002ip8dt42skkg3z	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpurcb6w002dp8dt7yh2bsa0	Created PLC-010	2026-06-01 05:17:57.829	\N	\N	\N	\N
cmpurjlja002kp8dt2ij99co8	cmoj2rf13002xxk85dachrvmn	task.delete	Task	cmol1bjh60078lltv86c6lih9	not needed	2026-06-01 05:23:37.799	\N	\N	\N	\N
cmpusu81k0035p8dtlcviqk65	cmoj2rf13002xxk85dachrvmn	role.contact_set	OwnerRole	cmpust3j2002op8dt40hcvutg	Set owner contact for Registrar: Dr. Krishnaraj <krishnaraj.rtc@rathinam.in>	2026-06-01 05:59:53.144	\N	\N	\N	\N
cmpuswlym0037p8dt76tpb2ay	cmoj2rf13002xxk85dachrvmn	role.contact_set	OwnerRole	cmpust3j2002op8dt40hcvutg	Set owner contact for Registrar: Dr. Krishnaraj <registrar@rathinam.in>	2026-06-01 06:01:44.494	\N	\N	\N	\N
cmpv3cc380007zsl62blvclav	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpv3cc1p0002zsl63cvbi0he	Created SSP-001	2026-06-01 10:53:54.356	\N	\N	\N	\N
cmpw054pu0007nlrea00f0y6w	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmpw052rd0002nlred0znzt9b	Created REG-002	2026-06-02 02:12:05.538	\N	\N	\N	\N
cmq0vp5je000fnlre5ihdz9sh	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq0vp5ie000anlrezeaf6fvx	Created RTC-018	2026-06-05 12:06:32.522	\N	\N	\N	\N
cmq1zgue0000qnlre65xs9asr	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq1zgucx000lnlrepx4yrq4i	Created RTC-019	2026-06-06 06:39:49.464	\N	\N	\N	\N
cmq2990fa000ynlrel4il88o4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq2990eg000tnlreiiooserz	Created CRT-052	2026-06-06 11:13:40.198	\N	\N	\N	\N
cmq57fwed0016nlrez0ocruej	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq57fwdb0011nlre6xctwu7g	Created RGU-066	2026-06-08 12:46:20.869	\N	\N	\N	\N
cmq57h13z001enlre2bdmpquq	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq57h13a0019nlrejtmle83m	Created MKT-097	2026-06-08 12:47:13.632	\N	\N	\N	\N
cmq584ydb001mnlredhe9lcss	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq584ycb001hnlrehrn5g1c1	Created MKT-098	2026-06-08 13:05:49.823	\N	\N	\N	\N
cmq58c4lq001unlremy16er52	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq58c4kq001pnlres3zw0z7z	Created MKT-099	2026-06-08 13:11:24.494	\N	\N	\N	\N
cmq58de2z0022nlreom5oqnwi	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq58de2a001xnlreupd44uws	Created MKT-100	2026-06-08 13:12:23.435	\N	\N	\N	\N
cmq7n8f6e002anlrepyw2ga66	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq7n8f510025nlre1w31hx79	Created RAALE-003	2026-06-10 05:43:58.167	\N	\N	\N	\N
cmq7nafgu002inlre0jyjkphg	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmq7naffz002dnlreb7zuqr4s	Created MKT-101	2026-06-10 05:45:31.854	\N	\N	\N	\N
cmq7nsjpk003rnlre7lynlzfh	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmpw052rd0002nlred0znzt9b	not needed	2026-06-10 05:59:37.16	\N	\N	\N	\N
cmq7odqnu0066nlreirt557zk	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmok0l3u90008p2zxrjgyw3ah	Not needed	2026-06-10 06:16:05.946	\N	\N	\N	\N
cmq7p8zx70097nlrerqc17a7n	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7p8zwk0092nlrervog00t8	Created RAALE-004	2026-06-10 06:40:24.283	\N	\N	\N	\N
cmq7pam9u009cnlrerd535x9k	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmoqpgpjv001u5tvm94k2ckn2	Already done	2026-06-10 06:41:39.907	\N	\N	\N	\N
cmq7pbkiq009hnlrebammh4e8	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmokzbpus000354jtun9oyqyw	Not needed	2026-06-10 06:42:24.29	\N	\N	\N	\N
cmq7pg6rc009pnlrebsi960pd	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmol033xy0002lltvxk4mdt5g	not needed	2026-06-10 06:45:59.736	\N	\N	\N	\N
cmq7pizs0009vnlrebod7msql	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmpsozbkq000gp8dt5fskv8i3	remove	2026-06-10 06:48:10.656	\N	\N	\N	\N
cmq7py3go00bdnlrekki7i6hd	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmol0mjal002clltv30convoz	remove	2026-06-10 06:59:55.272	\N	\N	\N	\N
cmq7q0p3800brnlre81yhe3ya	cmoj2reur002txk85m6ya4byh	task.delete	Task	cmokzr25m000x54jtgb0hyjov	remove	2026-06-10 07:01:56.612	\N	\N	\N	\N
cmq7qxiu500cknlrezuznbfm8	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7qxisr00cfnlrefryyuvrz	Created PLC-011	2026-06-10 07:27:28.139	\N	\N	\N	\N
cmq7qzk9400csnlreis8d55fb	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7qzk8g00cnnlre3k6ebp4h	Created MKT-102	2026-06-10 07:29:03.305	\N	\N	\N	\N
cmq7r0rdg00d0nlrevh5kgwin	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7r0rcr00cvnlreilqqodwa	Created RGU-067	2026-06-10 07:29:59.188	\N	\N	\N	\N
cmq7r3jw300d4nlre499l6b3c	cmoj2reur002txk85m6ya4byh	vertical.create	Vertical	cmq7r3jvy00d2nlrev76jr1jz	RSH — Research	2026-06-10 07:32:09.459	\N	\N	\N	\N
cmq7r4xrk00ddnlrez79qc4l9	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7r4xqq00d8nlreltdhfpeh	Created RSH-001	2026-06-10 07:33:14.096	\N	\N	\N	\N
cmq7r6ic400dlnlren8gqvsoy	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7r6ib900dgnlreli5ui3zw	Created RGU-068	2026-06-10 07:34:27.413	\N	\N	\N	\N
cmq7r82s300dwnlrepgaiirev	cmoj2reur002txk85m6ya4byh	task.create	Task	cmq7r82rl00drnlreykayyylu	Created REG-002	2026-06-10 07:35:40.564	\N	\N	\N	\N
cmq92pm3900dynlre39qxuk11	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxxqws1002v5tvm4285bxdu	LAS — Liberal Arts & Science	2026-06-11 05:45:00.693	\N	\N	\N	\N
cmq92pp9700e0nlreuj8v3pdt	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxxn71k002s5tvmkhszbqxk	ABFAT — Applied Biosciences, Food & Agri-Tech	2026-06-11 05:45:04.755	\N	\N	\N	\N
cmq92prkx00e2nlrez0dw5dau	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxx6y6r002i5tvmi9gve1y0	EET — Engineering & Emerging Technologies	2026-06-11 05:45:07.809	\N	\N	\N	\N
cmq92pzda00e4nlree3rpvnpd	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxxgtum002l5tvmqd8j7b9q	BCOM — Business & Commerce	2026-06-11 05:45:17.902	\N	\N	\N	\N
cmq92q69400e6nlreh5yujkq1	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxx53ba002f5tvm8aotskxe	QSCAI — Quantum Science, Computing & AI	2026-06-11 05:45:26.824	\N	\N	\N	\N
cmq92qc4j00e8nlrepsbbmkjq	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxxt9f000315tvm4av2owtl	SCS — Sustainability & Climate Studies	2026-06-11 05:45:34.435	\N	\N	\N	\N
cmq92qeel00eanlreb1udia25	cmoj2reur002txk85m6ya4byh	vertical.delete	Vertical	cmoxxu1od00345tvm18okxdox	SHS — Sports & Health Sciences	2026-06-11 05:45:37.39	\N	\N	\N	\N
cmqafcnl500einlre59tjb9lk	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqafcnk800ednlre4fggtb9s	Created MKT-103	2026-06-12 04:26:37.29	\N	\N	\N	\N
cmqaved9900eqnlreh4vz38nn	cmoj2reur002txk85m6ya4byh	task.create	Task	cmqaved8h00elnlres4mjfnpd	Created MKT-104	2026-06-12 11:55:51.069	\N	\N	\N	\N
cmqettjc100eynlre3dp1u859	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqettjab00etnlre4xhpzr0l	Created RGU-069	2026-06-15 06:22:44.257	\N	\N	\N	\N
cmqetu6p200f6nlredwp8jzzf	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqetu6oe00f1nlreqxo683hw	Created RGU-070	2026-06-15 06:23:14.534	\N	\N	\N	\N
cmqetvdrj00fenlre28ifjsqa	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqetvdr200f9nlrevvvlbmy4	Created RGU-071	2026-06-15 06:24:10.352	\N	\N	\N	\N
cmqetvyeo00fmnlretsd00ysz	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqetvye800fhnlreilr6h75j	Created RGU-072	2026-06-15 06:24:37.104	\N	\N	\N	\N
cmqeu2uv300funlreoceqjkh0	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu2utz00fpnlre2kcnxfsj	Created RGU-073	2026-06-15 06:29:59.103	\N	\N	\N	\N
cmqeu4glr00g2nlreph8aed3b	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu4gl000fxnlrebbgbvsau	Created RGU-074	2026-06-15 06:31:13.935	\N	\N	\N	\N
cmqeu5gdf00ganlrew4g177ig	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu5gct00g5nlre0t4k9fns	Created RGU-075	2026-06-15 06:32:00.291	\N	\N	\N	\N
cmqeu96u200gqnlreu1mmq6w9	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu96tl00glnlrejclj6v5x	Created RGU-077	2026-06-15 06:34:54.554	\N	\N	\N	\N
cmqeu7ekp00ginlrehjf2dnr4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu7ek900gdnlreq4rh8gcq	Created RGU-076	2026-06-15 06:33:31.273	\N	\N	\N	\N
cmqeu9ols00gynlreiwq8kao7	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeu9ol000gtnlre4g3q89uz	Created RGU-078	2026-06-15 06:35:17.584	\N	\N	\N	\N
cmqeub0p000h6nlresyuapeh8	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeub0o900h1nlrewaiidrf2	Created RGU-079	2026-06-15 06:36:19.908	\N	\N	\N	\N
cmqeubm6g00henlrezrk7rr5a	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeubm5y00h9nlre35vay5fk	Created RGU-080	2026-06-15 06:36:47.753	\N	\N	\N	\N
cmqeuccve00hmnlre2woes5v6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeuccux00hhnlre1z3cnhvd	Created RGU-081	2026-06-15 06:37:22.346	\N	\N	\N	\N
cmqeudcjt00hunlrebczjf42d	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeudcjc00hpnlrevdk2mdm5	Created RGU-082	2026-06-15 06:38:08.585	\N	\N	\N	\N
cmqeuedly00i2nlreg4jskqrt	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeuedlg00hxnlreojqkaxpm	Created RGU-083	2026-06-15 06:38:56.614	\N	\N	\N	\N
cmqeuet1o00ianlrec0szu4fr	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeuet0y00i5nlre93jnn1bp	Created RGU-084	2026-06-15 06:39:16.62	\N	\N	\N	\N
cmqew6yhi00k0nlreuoh2tkz6	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqew6ygu00jvnlreygahi8mh	Created RGU-085	2026-06-15 07:29:09.654	\N	\N	\N	\N
cmqew7kyq00k8nlredmroqwpt	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqew7ky500k3nlrevchhiec1	Created RGU-086	2026-06-15 07:29:38.786	\N	\N	\N	\N
cmqew8dcf00kgnlrekqcvtwa7	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqew8dbm00kbnlredop4kuo1	Created RGU-087	2026-06-15 07:30:15.567	\N	\N	\N	\N
cmqew91dm00konlreubxx3b3f	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqew91d600kjnlre6ljn7wu3	Created RGU-088	2026-06-15 07:30:46.714	\N	\N	\N	\N
cmqewcxq900kwnlreyfcv86y4	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqewcxpe00krnlrejzjny51u	Created RGU-089	2026-06-15 07:33:48.609	\N	\N	\N	\N
cmqewdru500l4nlre7aqomqz0	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqewdrtf00kznlrexpwfvkb8	Created RGU-090	2026-06-15 07:34:27.63	\N	\N	\N	\N
cmqeweif700lcnlreftd5yoht	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqeweiep00l7nlre2sk5d371	Created RGU-091	2026-06-15 07:35:02.083	\N	\N	\N	\N
cmqewf6b900lknlrenqhcti8h	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqewf6as00lfnlre03ljgkmo	Created RGU-092	2026-06-15 07:35:33.046	\N	\N	\N	\N
cmqewfx8x00lsnlrefd2szess	cmoj2rf13002xxk85dachrvmn	task.create	Task	cmqewfx8700lnnlrez220usct	Created RGU-093	2026-06-15 07:36:07.953	\N	\N	\N	\N
\.


--
-- Data for Name: Availability; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Availability" (id, "userId", "dayOfWeek", "startMin", "endMin", label, active, "createdAt") FROM stdin;
\.


--
-- Data for Name: BossInstruction; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."BossInstruction" (id, "receivedAt", instruction, source, "verticalId", "capturedById", status, "responseGiven", "linkedTaskId", "createdAt", "activatedAt", state) FROM stdin;
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."FeatureFlag" (key, enabled, category, label, description, "updatedAt", "updatedById") FROM stdin;
backup_restore	f	security	Database Backup & Restore	Adds /admin/backup with a one-click pg_dump download and a password-gated restore from a .sql file. Requires `pg_dump` and `psql` binaries on the server's PATH and a valid DATABASE_URL.	2026-06-11 05:07:58.675	\N
feature_flags_enforced	t	core	Enforce Feature Flags	Master kill-switch. When OFF, every other flag is treated as disabled regardless of its stored value. Useful for rollback in an incident.	2026-06-11 05:07:58.63	\N
audit_log_v2	f	security	Comprehensive Audit Log	Records every mutation (create, update, delete) routed through lib/audit.ts with before/after JSON snapshots, IP, and user-agent.	2026-06-11 05:07:58.637	\N
zod_validation	f	security	Strict Input Validation (Zod)	Runs server-action FormData through Zod schemas before touching the database. Reject malformed input with a structured error.	2026-06-11 05:07:58.64	\N
task_pagination	f	scale	Cursor Pagination on Task Register	Replaces the hard cap of 200 rows with cursor-based pagination plus server-side sort. Required at >5k tasks.	2026-06-11 05:07:58.642	\N
task_bulk_actions	f	scale	Bulk Actions on Tasks	Multi-select checkboxes on the task register with a sticky toolbar (bulk drop, bulk reassign owner role).	2026-06-11 05:07:58.644	\N
csv_export	f	scale	CSV Export	Download buttons on Task Register, Audit Log, and Weekly Summary. Streams CSV via /api/export/*.	2026-06-11 05:07:58.646	\N
drop_reason	f	workflow	Capture Reason on Drop	When a task is dropped, prompt for and store a reason on Task.dropReason. Visible in the Dropped Archive.	2026-06-11 05:07:58.649	\N
boss_instruction_workflow	f	workflow	Boss Instruction Activation Flow	Adds an Activate / Park / Close action set on each Boss Instruction. Activate spawns a draft Task and links it via Task.sourceInstructionId.	2026-06-11 05:07:58.651	\N
parking_auto_promote	f	workflow	Parking → Task Auto-Promote	When CBO sets a Parking Lot decision to Activate, instantly draft a linked Task pre-filled with the idea, vertical, and impact/urgency.	2026-06-11 05:07:58.653	\N
sla_engine	f	workflow	SLA Engine	Computes a slaDueAt per task from priority cadence (P1=24h, P2=72h, P3=7d, P4=14d). Surfaces SLA-breached tasks on dashboards.	2026-06-11 05:07:58.657	\N
saved_views	f	workflow	Saved Filter Views	Lets each user pin filter combinations on the Task Register and reopen them from the sidebar. (Phase 2 — UI scaffold lands now.)	2026-06-11 05:07:58.659	\N
notification_preferences	f	workflow	Per-User Notification Preferences	Adds a /preferences page where each user can mute classes of in-app notifications. (Phase 2 — UI scaffold lands now.)	2026-06-11 05:07:58.661	\N
breadcrumbs	f	ux	Breadcrumb Trail	Shows a breadcrumb above every portal page derived from the URL.	2026-06-11 05:07:58.664	\N
dark_mode_toggle	f	ux	Dark Mode Toggle	Adds a sun/moon button in the sidebar footer that flips the Tailwind dark class.	2026-06-11 05:07:58.667	\N
toasts	f	ux	Toast Notifications	Mounts the shadcn Toaster. Server actions can emit ephemeral success / error toasts.	2026-06-11 05:07:58.668	\N
route_error_boundaries	f	ux	Per-Route Error Boundaries	Drops a friendly error.tsx into each portal segment so a thrown error in one panel does not blank the page.	2026-06-11 05:07:58.67	\N
optimistic_ui	f	ux	Optimistic UI on Mutations	Where applicable (status change, intervention resolve) updates the UI before the server round-trip completes.	2026-06-11 05:07:58.673	\N
\.


--
-- Data for Name: Intervention; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Intervention" (id, "taskId", "verticalId", issue, "whyNeeded", "decisionRequired", deadline, "noteAttached", resolved, "resolutionNote", "decisionType", "snoozedUntil", "cboNote", "raisedById", "createdAt", "resolvedAt") FROM stdin;
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Note" (id, "authorId", "audienceRole", text, "audioBytes", "audioMime", "audioDurationS", "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Notification" (id, "recipientId", "senderId", kind, title, body, link, "refId", "seenAt", "createdAt") FROM stdin;
cmojmehrb0004p2zxiqio4qsx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-009 · HBS Learning Review	/cbo/verticals/RGU	cmojmehr10003p2zxmb92v3uv	2026-04-29 17:59:25.182	2026-04-29 05:34:31.272
cmok0l3un0009p2zx49dnbqg5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-010 · HBS Learning Review	/cbo/verticals/RGU	cmok0l3u90008p2zxrjgyw3ah	2026-04-29 17:59:25.182	2026-04-29 12:11:34.463
cmok2pfx5002sp2zxzl57gj8p	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-011 · Airport copy -2 designs	/cbo/verticals/RGU	cmok2pfww002rp2zxup9y0jie	2026-04-29 17:59:25.182	2026-04-29 13:10:55.962
cmok2s212002vp2zx50okgwui	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-012 · Online meeting with HBS with MBA leader	/cbo/verticals/RGU	cmok2s20r002up2zxw7td5pdy	2026-04-29 17:59:25.182	2026-04-29 13:12:57.926
cmok2wc9w002yp2zxaor2k6vb	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-013 · Hardcopy Invitation for Guests	/cbo/verticals/RGU	cmok2wc9o002xp2zxrnrr0w23	2026-04-29 17:59:25.182	2026-04-29 13:16:17.828
cmok2zxzb0031p2zxto52wp4g	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-014 · Kit for IT employees	/cbo/verticals/RGU	cmok2zxyw0030p2zx8woiygko	2026-04-29 17:59:25.182	2026-04-29 13:19:05.927
cmok35hwx0034p2zxp3ek7wma	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-015 · Faculty Handbook Distribution	/cbo/verticals/RGU	cmok35hwo0033p2zxobzj12at	2026-04-29 17:59:25.182	2026-04-29 13:23:25.042
cmokyz0m200066gwxfp7lremk	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-016 · Guest finalisation	/cbo/verticals/RGU	cmokyz0lj00056gwx44561j9c	\N	2026-04-30 04:14:10.395
cmokz3ap4000g6gwxmjh3wmbq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-043 · RSTNAT exam portal discussion	/cbo/verticals/MKT	cmokz3aos000f6gwxkkqpf8lv	\N	2026-04-30 04:17:30.089
cmokz3mrm000l6gwxfsixxs84	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-043 · RSTNAT exam portal discussion	/cbo/verticals/MKT	cmokz3aos000f6gwxkkqpf8lv	\N	2026-04-30 04:17:45.731
cmokzbpv9000454jtjm0keght	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-044 · Video for healthcare	/cbo/verticals/MKT	cmokzbpus000354jtun9oyqyw	\N	2026-04-30 04:24:02.997
cmokzhm2h000a54jtp67z6jxw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-045 · Reel and Webinar sent to biology students in Raw data campaign	/cbo/verticals/MKT	cmokzhm2c000954jt2as9x713	\N	2026-04-30 04:28:38.009
cmokzkqf6000g54jtwnvsisyu	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-046 · May 1 offer day	/cbo/verticals/MKT	cmokzkqep000f54jt9bba10eo	\N	2026-04-30 04:31:03.618
cmokzm8kd000m54jtdbe4je34	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-047 · Student undertaking documentation	/cbo/verticals/MKT	cmokzm8k6000l54jtfzogvob3	\N	2026-04-30 04:32:13.789
cmokznkc8000s54jtrrkb5n0v	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-048 · Discussion with Corporate Gurukul	/cbo/verticals/MKT	cmokznkc3000r54jt1xfx3gn3	\N	2026-04-30 04:33:15.704
cmokzr25w000y54jt149y17u4	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-017 · Learning path of Computing  & AI book	/cbo/verticals/RGU	cmokzr25m000x54jtgb0hyjov	\N	2026-04-30 04:35:58.772
cmokzshta001454jtklji83r7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-018 · Meeting for IT Server for RSmart classes with IT team	/cbo/verticals/RGU	cmokzshsf001354jtd0pmqgwl	\N	2026-04-30 04:37:05.709
cmokzueyb001a54jt7x7d843x	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-049 · Recruitment of coders through RSmart for Product engineers	/cbo/verticals/MKT	cmokzuevx001954jtdct4b9ot	\N	2026-04-30 04:38:35.314
cmokzwslp001g54jtltg9vu4p	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-019 · Online Presentation for Google AI CoE	/cbo/verticals/RGU	cmokzwsjv001f54jt5w5et3uh	\N	2026-04-30 04:40:26.317
cmol033ys0003lltvbxv4h4u5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-050 · BCom Video by Hema	/cbo/verticals/MKT	cmol033xy0002lltvxk4mdt5g	\N	2026-04-30 04:45:20.981
cmol04e3c0009lltvp56pitvj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-051 · BCom Video by Hema	/cbo/verticals/MKT	cmol04e340008lltvpm473qod	\N	2026-04-30 04:46:20.761
cmol05qwt000elltv76y8jwo7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-051 · Malayalam Video for Viscom	/cbo/verticals/MKT	cmol04e340008lltvpm473qod	\N	2026-04-30 04:47:24.029
cmol06fkn000illtvkklf645q	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-052 · Viscom Studio Infra Video	/cbo/verticals/MKT	cmol06fki000hlltv11tjdlse	\N	2026-04-30 04:47:55.991
cmol06rf7000olltvtdexuj7l	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-053 · Alumni portfolio-5 videos (Viscom & Fashion)	/cbo/verticals/MKT	cmol06rf2000nlltv4xh76si4	\N	2026-04-30 04:48:11.348
cmol07et4000ulltvhaiz7osn	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-054 · What is Viscom & Fashion	/cbo/verticals/MKT	cmol07esr000tlltvqyfe4tg3	\N	2026-04-30 04:48:41.656
cmol07stz0010lltvcs7kta72	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-055 · AI chatbot for Viscom leads	/cbo/verticals/MKT	cmol07stu000zlltv5nmnrjwv	\N	2026-04-30 04:48:59.831
cmol084zw0016lltve8h9v4v6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-056 · Career Path in FAshion	/cbo/verticals/MKT	cmol084zs0015lltv4zmr0xjs	\N	2026-04-30 04:49:15.597
cmol08emt001clltvhjljvmyr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-057 · Webinar for photography and fashion	/cbo/verticals/MKT	cmol08emp001blltv3bod4x30	\N	2026-04-30 04:49:28.086
cmol08vuo001illtvx5lnzk83	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-058 · Viscom Ad run for Madurai & Palakkad	/cbo/verticals/MKT	cmol08vuj001hlltvfoy03mnn	\N	2026-04-30 04:49:50.4
cmol098n7001olltvabr3ssor	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-059 · Fashion related Influencers can be planned	/cbo/verticals/MKT	cmol098n3001nlltvlhm9wq3q	\N	2026-04-30 04:50:06.98
cmol0a6a4001tlltvajrkg01f	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-057 · Webinar for photography and fashion	/cbo/verticals/MKT	cmol08emp001blltv3bod4x30	\N	2026-04-30 04:50:50.573
cmol0kdfi001xlltvqeqhu4bf	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-020 · Temporary Entrance Arch	/cbo/verticals/RGU	cmol0kdf3001wlltvu4o07lfs	\N	2026-04-30 04:58:46.398
cmol0lvgb0025lltv208f2747	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-021 · Achievement Flags	/cbo/verticals/RGU	cmol0lvg60024lltvu09l47i0	\N	2026-04-30 04:59:56.411
cmol0mjap002dlltvakzeoxgp	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-022 · Campus Ambience Overall	/cbo/verticals/RGU	cmol0mjal002clltv30convoz	\N	2026-04-30 05:00:27.314
cmol0nan3002llltvw5hljvk1	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-023 · School & RGU Flags Raised	/cbo/verticals/RGU	cmol0namz002klltv53v7voiu	\N	2026-04-30 05:01:02.751
cmol0ozag002tlltveow3jgxq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-024 · Faculty T-Shirts	/cbo/verticals/RGU	cmol0ozaa002slltvl985mqwz	\N	2026-04-30 05:02:21.353
cmol0q5db0031lltv9qen1o2e	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-060 · Visiting Cards with Envelopes / Box	/cbo/verticals/MKT	cmol0q5d60030lltvu45rxwgm	\N	2026-04-30 05:03:15.887
cmol0rkfo0039lltv5a5xdglu	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-025 · Legacy Wall Unveiled	/cbo/verticals/RGU	cmol0rkf80038lltvh9l0izwv	\N	2026-04-30 05:04:22.068
cmol0sawy003flltvixp5fb6q	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-026 · Thank You Card	/cbo/verticals/RGU	cmol0sawt003elltvjks06c8c	\N	2026-04-30 05:04:56.387
cmol0tbtj003llltvfiulp4jt	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-027 · Design is yet to be received.	/cbo/verticals/RGU	cmol0tbtd003klltvlqk9t6ab	\N	2026-04-30 05:05:44.215
cmol0tx4f003qlltvppwgns8f	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-027 · Name Badge	/cbo/verticals/RGU	cmol0tbtd003klltvlqk9t6ab	\N	2026-04-30 05:06:11.823
cmol0ur9i003wlltvl8hv2fjt	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-028 · Department Pride Boards	/cbo/verticals/RGU	cmol0ur96003vlltvwgpsga8u	\N	2026-04-30 05:06:50.886
cmol0vbzq0044lltvtaclxj31	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-029 · Founding Faculty Certificate	/cbo/verticals/RGU	cmol0vbzl0043lltvf64fhdzs	\N	2026-04-30 05:07:17.75
cmol0wjc0004clltvc57zr754	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-030 · Gratitude Wall Founding Faculty	/cbo/verticals/RGU	cmol0wjbw004blltvgwksns1y	\N	2026-04-30 05:08:13.921
cmol0xq5q004klltvkspldvuz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-031 · Student Manifesto Campaign	/cbo/verticals/RGU	cmol0xq5f004jlltvn0f6ah0l	\N	2026-04-30 05:09:09.422
cmol0y69i004qlltvpphnyo5z	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-032 · RGU Logo Launch	/cbo/verticals/RGU	cmol0y697004plltveig2mw0j	\N	2026-04-30 05:09:30.295
cmol0zhrf004ylltvve274n1y	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-033 · Skill Passport Launch	/cbo/verticals/RGU	cmol0zhra004xlltvdsx00o5o	\N	2026-04-30 05:10:31.852
cmol100ur0056lltvjzrsbtbj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-034 · The Pride Summit Brochure	/cbo/verticals/RGU	cmol100un0055lltvr783b2hg	\N	2026-04-30 05:10:56.596
cmol10din005clltvb6zw0rzf	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-035 · RGU Coffee Table Book	/cbo/verticals/RGU	cmol10dij005blltv0kazatah	\N	2026-04-30 05:11:13.007
cmol10tuf005illtvkhg3snzo	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-036 · RGU Brochure	/cbo/verticals/RGU	cmol10tub005hlltv7axlxwze	\N	2026-04-30 05:11:34.167
cmol118h9005olltvgvd799lu	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-037 · May 15 Invitation	/cbo/verticals/RGU	cmol118h5005nlltvbyzbaqbm	\N	2026-04-30 05:11:53.134
cmol13mew005ulltvt8eetc4k	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-038 · Teaser video	/cbo/verticals/RGU	cmol13mem005tlltvw9p6cjar	\N	2026-04-30 05:13:44.504
cmol151nd0060lltvfdrb0f96	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-039 · Chairman Video	/cbo/verticals/RGU	cmol151n3005zlltvsrj80evq	\N	2026-04-30 05:14:50.905
cmol15ejx0066lltv7z35jr27	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-040 · Founding faculty certificate	/cbo/verticals/RGU	cmol15ejs0065lltv9xgpay3p	\N	2026-04-30 05:15:07.63
cmol162u6006clltvgwphsl27	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-041 · Skill Passport	/cbo/verticals/RGU	cmol162tr006blltve6vh3d4f	\N	2026-04-30 05:15:39.102
cmol16o9o006hlltv8v7cgffw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-029 · Founding Faculty Certificate	/cbo/verticals/RGU	cmol0vbzl0043lltvf64fhdzs	\N	2026-04-30 05:16:06.877
cmol17wd7006llltv5w1pi4rd	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-042 · Paper ad for RGU launch	/cbo/verticals/RGU	cmol17wd3006klltvk73gxk83	\N	2026-04-30 05:17:04.027
cmol1afl6006rlltvyvq82h50	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-043 · Thank you card	/cbo/verticals/RGU	cmol1afkx006qlltvfobd3p8u	\N	2026-04-30 05:19:02.25
cmol1av3r006xlltv1twfp69a	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-044 · Visiting card	/cbo/verticals/RGU	cmol1av3m006wlltvnfz82z5d	\N	2026-04-30 05:19:22.359
cmol1b6c80073lltvhd3rwneb	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-045 · Visiting card	/cbo/verticals/RGU	cmol1b6c40072lltvm7ukd234	\N	2026-04-30 05:19:36.921
cmol1bjhh0079lltvw8ms8qzt	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-046 · Tshirts	/cbo/verticals/RGU	cmol1bjh60078lltv86c6lih9	\N	2026-04-30 05:19:53.957
cmol1btgn007flltvv0qyyd9e	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-047 · Name badge	/cbo/verticals/RGU	cmol1btgh007elltvridj5ut5	\N	2026-04-30 05:20:06.887
cmol1c9fo007llltvavbwifc5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-048 · Square badge	/cbo/verticals/RGU	cmol1c9fj007klltv9uci9ey6	\N	2026-04-30 05:20:27.589
cmol1cpxm007rlltvfmoi1wkg	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-049 · Faculty video	/cbo/verticals/RGU	cmol1cpxh007qlltva536ro2m	\N	2026-04-30 05:20:48.97
cmol2s4j3007wlltvc9hycz6r	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-050 · BCom Video by Hema	/cbo/verticals/MKT	cmol033xy0002lltvxk4mdt5g	\N	2026-04-30 06:00:47.343
cmol2td5o007zlltv6f4tv3w5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-051 · Malayalam Video for Viscom	/cbo/verticals/MKT	cmol04e340008lltvpm473qod	\N	2026-04-30 06:01:45.181
cmol2uf9p0082lltv4nrsevir	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-052 · Viscom Studio Infra Video	/cbo/verticals/MKT	cmol06fki000hlltv11tjdlse	\N	2026-04-30 06:02:34.573
cmol2vdq00085lltvvaw4bwqn	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-053 · Alumni portfolio-5 videos (Viscom & Fashion)	/cbo/verticals/MKT	cmol06rf2000nlltv4xh76si4	\N	2026-04-30 06:03:19.225
cmol2wy9y0088lltvbowt3o2q	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-054 · What is Viscom & Fashion	/cbo/verticals/MKT	cmol07esr000tlltvqyfe4tg3	\N	2026-04-30 06:04:32.518
cmol2xo12008blltv4awk1j40	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-055 · AI chatbot for Viscom leads	/cbo/verticals/MKT	cmol07stu000zlltv5nmnrjwv	\N	2026-04-30 06:05:05.894
cmol467zj008flltvo4avgr3j	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-061 · Career Path in FAshion	/cbo/verticals/MKT	cmol467yz008elltvjj75mv3k	\N	2026-04-30 06:39:44.623
cmol4esa0008illtvg7l7ijg5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-057 · Webinar for photography and fashion	/cbo/verticals/MKT	cmol08emp001blltv3bod4x30	\N	2026-04-30 06:46:24.132
cmol4fmen008llltvcfepwpsl	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-058 · Viscom Ad run for Madurai & Palakkad	/cbo/verticals/MKT	cmol08vuj001hlltvfoy03mnn	\N	2026-04-30 06:47:03.215
cmol4i284008olltvngrx4jga	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-059 · Fashion related Influencers can be planned	/cbo/verticals/MKT	cmol098n3001nlltvlhm9wq3q	\N	2026-04-30 06:48:57.028
cmol4k5xx008slltva782pp1m	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-062 · Video script content for B.Com	/cbo/verticals/MKT	cmol4k5xn008rlltv2ohqwnw3	\N	2026-04-30 06:50:35.157
cmol4kulg008ylltvsj20l0ya	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-04-30 06:51:07.108
cmol4mru40093lltvkbc8qs1w	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-062 · Video script content for B.Com	/cbo/verticals/MKT	cmol4k5xn008rlltv2ohqwnw3	\N	2026-04-30 06:52:36.845
cmol700y4009illtv5xpe7ztz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-038 · Teaser video	/cbo/verticals/RGU	cmol13mem005tlltvw9p6cjar	\N	2026-04-30 07:58:54.412
cmolbtduv000f5tvms21zip20	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-04-30 10:13:42.632
cmoqp5psw000j5tvm8il6nk6s	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-064 · Fix a KPI for chat	/cbo/verticals/MKT	cmoqp5ps0000i5tvmjw33bt46	\N	2026-05-04 04:26:03.873
cmoqp6xck000p5tvmpb80oi08	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-065 · Chatbot for Viscom,Fahion & MBA	/cbo/verticals/MKT	cmoqp6xce000o5tvmkebvt656	\N	2026-05-04 04:27:00.308
cmoqp77wu000v5tvmsu9nb2su	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-066 · Increase digital spent in SAlem,Pollachi areas	/cbo/verticals/MKT	cmoqp77wq000u5tvm2k2xey51	\N	2026-05-04 04:27:13.998
cmoqp9yz200115tvm3uqzmcgx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-067 · RTC UG & RCAS UG can be concentrated for Tiruppur	/cbo/verticals/MKT	cmoqp9yyn00105tvmst9mr9ub	\N	2026-05-04 04:29:22.383
cmoqpaors00175tvm2orgye8w	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-068 · Common ad budget can be reduced and location specific ads can be increased	/cbo/verticals/MKT	cmoqpaore00165tvmaw2fu975	\N	2026-05-04 04:29:55.816
cmoqpf4ge001d5tvm4j99tkym	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-069 · Approval can be taken for consultants service charge for Physio and Pharmacy	/cbo/verticals/MKT	cmoqpf4g4001c5tvmfc4k88iv	\N	2026-05-04 04:33:22.766
cmoqpflsc001j5tvmnds2p38l	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-070 · For RGU consultant admission test is mandatory	/cbo/verticals/MKT	cmoqpfls7001i5tvmcgy4wbk5	\N	2026-05-04 04:33:45.228
cmoqpg5ml001p5tvmp9hfinsh	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-071 · May 15 admission offers can be planned	/cbo/verticals/MKT	cmoqpg5mh001o5tvmzzkrw3on	\N	2026-05-04 04:34:10.942
cmoqpgpjz001v5tvm6nrs0qyv	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-072 · In tha avbl budet 50% can be spent in May,25% in June and remaining in July	/cbo/verticals/MKT	cmoqpgpjv001u5tvm94k2ckn2	\N	2026-05-04 04:34:36.768
cmoqph70b00215tvmsgw316nc	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-073 · Increase whatsapp campaign for Viscom,CDF,Commerce	/cbo/verticals/MKT	cmoqph70000205tvm939y1q0b	\N	2026-05-04 04:34:59.388
cmosipe8400265tvmc21bf5mm	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-05-05 11:00:57.028
cmoskqk8q00295tvmj8wmbqm7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → IN PROGRESS	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-05-05 11:57:50.713
cmowgor4y002c5tvm6z1td8x8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-046 · May 1 offer day	/cbo/verticals/MKT	cmokzkqep000f54jt9bba10eo	\N	2026-05-08 05:15:32.579
cmp3mbny4003d5tvmtu5d3zoy	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-074 · Change of flex in front of College(pharm and physio) to RGU	/cbo/verticals/MKT	cmp3mbnx8003c5tvma6wxrd37	\N	2026-05-13 05:27:42.844
cmpdkpngt00415tvmggrbq287	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Fashion Design, Media & Performing Arts	FDMPA-001 · CDF HoD-Coat for lady faculties	/cbo/verticals/FDMPA	cmpdkpnfm00405tvm42qk2ry6	\N	2026-05-20 04:40:17.934
cmpdksnxl00465tvmm5rv4rkj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Fashion Design, Media & Performing Arts	FDMPA-001 · CDF HoD-Coat for lady faculties	/cbo/verticals/FDMPA	cmpdkpnfm00405tvm42qk2ry6	\N	2026-05-20 04:42:38.506
cmpezfk97001iuycd3m9abf4f	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-041 · Skill Passport	/cbo/verticals/RGU	cmol162tr006blltve6vh3d4f	\N	2026-05-21 04:20:07.627
cmpezg8hz001luycdvpymz1xt	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-041 · Skill Passport	/cbo/verticals/RGU	cmol162tr006blltve6vh3d4f	\N	2026-05-21 04:20:39.047
cmpezgof1001muycduvwpbrve	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-016 · Guest finalisation	/cbo/verticals/RGU	cmokyz0lj00056gwx44561j9c	\N	2026-05-21 04:20:59.677
cmpezgwli001puycd078t2bqf	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-016 · Guest finalisation	/cbo/verticals/RGU	cmokyz0lj00056gwx44561j9c	\N	2026-05-21 04:21:10.279
cmpezhfbt001quycdf3hvrpp2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-046 · May 1 offer day	/cbo/verticals/MKT	cmokzkqep000f54jt9bba10eo	\N	2026-05-21 04:21:34.553
cmpezhlf3001tuycd05nglodp	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-046 · May 1 offer day	/cbo/verticals/MKT	cmokzkqep000f54jt9bba10eo	\N	2026-05-21 04:21:42.447
cmpezi3en001uuycdlhaqgmil	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-013 · Hardcopy Invitation for Guests	/cbo/verticals/RGU	cmok2wc9o002xp2zxrnrr0w23	\N	2026-05-21 04:22:05.759
cmpezi8l4001xuycdf9gd8lkz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-013 · Hardcopy Invitation for Guests	/cbo/verticals/RGU	cmok2wc9o002xp2zxrnrr0w23	\N	2026-05-21 04:22:12.473
cmpezivx1001yuycd09g6ncfn	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	RGU-038 · Teaser video	/cbo/verticals/CRT	cmol13mem005tlltvw9p6cjar	\N	2026-05-21 04:22:42.71
cmpezj2bk0021uycdaimk1gm8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-038 · Teaser video	/cbo/verticals/CRT	cmol13mem005tlltvw9p6cjar	\N	2026-05-21 04:22:51.009
cmpezkggz0022uycdm68u9lgx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-037 · May 15 Invitation	/cbo/verticals/RGU	cmol118h5005nlltvbyzbaqbm	\N	2026-05-21 04:23:56.003
cmpezkln00025uycdnizsz9yv	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-037 · May 15 Invitation	/cbo/verticals/RGU	cmol118h5005nlltvbyzbaqbm	\N	2026-05-21 04:24:02.7
cmpezlp4e0028uycdr8idk4n2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-039 · Chairman Video	/cbo/verticals/RGU	cmol151n3005zlltvsrj80evq	\N	2026-05-21 04:24:53.87
cmpezltxv0029uycdn9p82mab	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	RGU-039 · Chairman Video	/cbo/verticals/CRT	cmol151n3005zlltvsrj80evq	\N	2026-05-21 04:25:00.115
cmpezm0bj002cuycdxy7xnvxd	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-039 · Chairman Video	/cbo/verticals/CRT	cmol151n3005zlltvsrj80evq	\N	2026-05-21 04:25:08.384
cmpezmkw9002duycdn5ux19j8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-032 · RGU Logo Launch	/cbo/verticals/RGU	cmol0y697004plltveig2mw0j	\N	2026-05-21 04:25:35.05
cmpezmpgl002guycdt25fu2wr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-032 · RGU Logo Launch	/cbo/verticals/RGU	cmol0y697004plltveig2mw0j	\N	2026-05-21 04:25:40.965
cmpeznkqj002huycdj5mmz8p6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-033 · Skill Passport Launch	/cbo/verticals/RGU	cmol0zhra004xlltvdsx00o5o	\N	2026-05-21 04:26:21.499
cmpeznyz1002iuycdksrf87rd	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-027 · Name Badge	/cbo/verticals/RGU	cmol0tbtd003klltvlqk9t6ab	\N	2026-05-21 04:26:39.95
cmpezo4dj002luycdm50gluxr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-027 · Name Badge	/cbo/verticals/RGU	cmol0tbtd003klltvlqk9t6ab	\N	2026-05-21 04:26:46.952
cmpezspn1002ouycdv8xh4ycz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-026 · Thank You Card	/cbo/verticals/RGU	cmol0sawt003elltvjks06c8c	\N	2026-05-21 04:30:21.133
cmpezsvi9002ruycdfyx79oq9	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-026 · Thank You Card	/cbo/verticals/RGU	cmol0sawt003elltvjks06c8c	\N	2026-05-21 04:30:28.738
cmpf9jmvv0003zj6swf0hb9zi	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-050 · Times Now Promotion Plan-Viscom Sathish	/cbo/verticals/RGU	cmpf9jmvi0002zj6s9wk6za3r	\N	2026-05-21 09:03:13.82
cmpf9jmw20005zj6sv08t8tjr	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-050 · Times Now Promotion Plan-Viscom Sathish	/sm/tasks/cmpf9jmvi0002zj6s9wk6za3r	cmpf9jmvi0002zj6s9wk6za3r	\N	2026-05-21 09:03:13.826
cmpf9tmbu000bzj6scaddlgr1	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-051 · Krishnakumar-Controller of Examination -RGU marksheet	/cbo/verticals/RGU	cmpf9tmbj000azj6sg179zznl	\N	2026-05-21 09:10:59.659
cmpf9tmbz000dzj6sh93ghub8	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-051 · Krishnakumar-Controller of Examination -RGU marksheet	/sm/tasks/cmpf9tmbj000azj6sg179zznl	cmpf9tmbj000azj6sg179zznl	\N	2026-05-21 09:10:59.664
cmpfa2ob2000jzj6sx5902rx0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-052 · Corporate & Academic Council Thank You Poster - Krishnaraj	/cbo/verticals/RGU	cmpfa2oat000izj6s6p58dzvq	\N	2026-05-21 09:18:02.126
cmpfa2ob5000lzj6sbrcf6swk	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-052 · Corporate & Academic Council Thank You Poster - Krishnaraj	/sm/tasks/cmpfa2oat000izj6s6p58dzvq	cmpfa2oat000izj6s6p58dzvq	\N	2026-05-21 09:18:02.129
cmpfa4y43000rzj6s1c1jzn8c	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Registrar	REG-001 · Corporate & Academic Council Create a On Boarding poster - Arunraaj	/cbo/verticals/REG	cmpfa4y3z000qzj6sjx7ty4bu	\N	2026-05-21 09:19:48.148
cmpfa4y45000tzj6seswu17c5	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Registrar	REG-001 · Corporate & Academic Council Create a On Boarding poster - Arunraaj	/sm/tasks/cmpfa4y3z000qzj6sjx7ty4bu	cmpfa4y3z000qzj6sjx7ty4bu	\N	2026-05-21 09:19:48.15
cmpfa6lgd000yzj6sts1r7e3z	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Registrar	REG-001 · Corporate & Academic Council Create a On Boarding poster - Arunraaj	/cbo/verticals/REG	cmpfa4y3z000qzj6sjx7ty4bu	\N	2026-05-21 09:21:05.053
cmpfacad90012zj6s9oqfgo7y	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-053 · Hoarding for RGU with Jasmine advertisement - Pandi	/cbo/verticals/RGU	cmpfacacy0011zj6s66ij16ka	\N	2026-05-21 09:25:30.621
cmpfacadd0014zj6snl8yqj93	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-053 · Hoarding for RGU with Jasmine advertisement - Pandi	/sm/tasks/cmpfacacy0011zj6s66ij16ka	cmpfacacy0011zj6s66ij16ka	\N	2026-05-21 09:25:30.625
cmpfaegdt001azj6see2ikcl9	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-054 · Distinguished Corporate – Photos	/cbo/verticals/RGU	cmpfaegdo0019zj6sn12qsnio	\N	2026-05-21 09:27:11.73
cmpfaegdw001czj6ssfe7046d	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-054 · Distinguished Corporate – Photos	/sm/tasks/cmpfaegdo0019zj6sn12qsnio	cmpfaegdo0019zj6sn12qsnio	\N	2026-05-21 09:27:11.733
cmpfaeo1n001hzj6sdcb19jst	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-054 · Distinguished Corporate – Photos	/cbo/verticals/RGU	cmpfaegdo0019zj6sn12qsnio	\N	2026-05-21 09:27:21.659
cmpfafdfm001lzj6sptc8jfeq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-055 · Corporate Logo Banners – PHotos	/cbo/verticals/RGU	cmpfafdfh001kzj6siu3h74vj	\N	2026-05-21 09:27:54.562
cmpfafdfo001nzj6sk1pzp3eg	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-055 · Corporate Logo Banners – PHotos	/sm/tasks/cmpfafdfh001kzj6siu3h74vj	cmpfafdfh001kzj6siu3h74vj	\N	2026-05-21 09:27:54.564
cmpfafnur001szj6shf1v40m0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-055 · Corporate Logo Banners – PHotos	/cbo/verticals/RGU	cmpfafdfh001kzj6siu3h74vj	\N	2026-05-21 09:28:08.067
cmpfaga3m001wzj6sd8tkxmse	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-056 · Global University Connection	/cbo/verticals/RGU	cmpfaga3h001vzj6sdvytoluj	\N	2026-05-21 09:28:36.898
cmpfaga3o001yzj6sr08st0xh	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-056 · Global University Connection	/sm/tasks/cmpfaga3h001vzj6sdvytoluj	cmpfaga3h001vzj6sdvytoluj	\N	2026-05-21 09:28:36.9
cmpfagi6j0023zj6sh1i875uq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-056 · Global University Connection	/cbo/verticals/RGU	cmpfaga3h001vzj6sdvytoluj	\N	2026-05-21 09:28:47.371
cmpfah9m50027zj6s2f3gr2po	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-057 · VIP Guest List	/cbo/verticals/RGU	cmpfah9m10026zj6st3ss4wnd	\N	2026-05-21 09:29:22.925
cmpfah9m70029zj6ssnj0ny5w	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-057 · VIP Guest List	/sm/tasks/cmpfah9m10026zj6st3ss4wnd	cmpfah9m10026zj6st3ss4wnd	\N	2026-05-21 09:29:22.927
cmpfahj0e002ezj6su7itplm3	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-057 · VIP Guest List	/cbo/verticals/RGU	cmpfah9m10026zj6st3ss4wnd	\N	2026-05-21 09:29:35.102
cmpfai436002izj6sz4l7rvn2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-058 · Chief Guest	/cbo/verticals/RGU	cmpfai432002hzj6sqi6tnypw	\N	2026-05-21 09:30:02.418
cmpfai438002kzj6s3dnq7p3u	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-058 · Chief Guest	/sm/tasks/cmpfai432002hzj6sqi6tnypw	cmpfai432002hzj6sqi6tnypw	\N	2026-05-21 09:30:02.421
cmpfaia5g002pzj6sum8shloo	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-058 · Chief Guest	/cbo/verticals/RGU	cmpfai432002hzj6sqi6tnypw	\N	2026-05-21 09:30:10.277
cmpfaizc4002tzj6s1i6xwe5u	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-059 · Commitment Card	/cbo/verticals/RGU	cmpfaizbs002szj6s4b9a2bnt	\N	2026-05-21 09:30:42.916
cmpfaizc7002vzj6s28izrowd	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-059 · Commitment Card	/sm/tasks/cmpfaizbs002szj6s4b9a2bnt	cmpfaizbs002szj6s4b9a2bnt	\N	2026-05-21 09:30:42.92
cmpfaj7wf0030zj6sh487s8lw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-059 · Commitment Card	/cbo/verticals/RGU	cmpfaizbs002szj6s4b9a2bnt	\N	2026-05-21 09:30:54.016
cmpfak7c30034zj6s0q2gltp2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-060 · School Video Launching	/cbo/verticals/RGU	cmpfak7bx0033zj6sqzxymmad	\N	2026-05-21 09:31:39.939
cmpfak7c50036zj6sw8jnnk1a	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-060 · School Video Launching	/sm/tasks/cmpfak7bx0033zj6sqzxymmad	cmpfak7bx0033zj6sqzxymmad	\N	2026-05-21 09:31:39.942
cmpfakefg003bzj6s3uu8gr2s	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-060 · School Video Launching	/cbo/verticals/RGU	cmpfak7bx0033zj6sqzxymmad	\N	2026-05-21 09:31:49.133
cmpfal5gb003fzj6seppj0b4d	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-061 · School Video Launching	/cbo/verticals/RGU	cmpfal5g6003ezj6shbl1fc0j	\N	2026-05-21 09:32:24.155
cmpfal5gd003hzj6sxm9y39k2	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-061 · School Video Launching	/sm/tasks/cmpfal5g6003ezj6shbl1fc0j	cmpfal5g6003ezj6shbl1fc0j	\N	2026-05-21 09:32:24.158
cmpfalbqy003mzj6sabxx91zh	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-061 · School Video Launching	/cbo/verticals/RGU	cmpfal5g6003ezj6shbl1fc0j	\N	2026-05-21 09:32:32.314
cmpfbvuqy003qzj6s6f0pjudi	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-062 · Self Booth Completed	/cbo/verticals/RGU	cmpfbvuqj003pzj6sjlpsmy1v	\N	2026-05-21 10:08:43.114
cmpfbvur2003szj6sj4xmepi1	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-062 · Self Booth Completed	/sm/tasks/cmpfbvuqj003pzj6sjlpsmy1v	cmpfbvuqj003pzj6sjlpsmy1v	\N	2026-05-21 10:08:43.118
cmpfbwgrw003xzj6spw45yzuh	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-062 · Self Booth Completed	/cbo/verticals/RGU	cmpfbvuqj003pzj6sjlpsmy1v	\N	2026-05-21 10:09:11.66
cmpfbz7d80041zj6ssgjll751	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-040 · RGU Ledger	/cbo/verticals/CRT	cmpfbz7d40040zj6siu2i1c96	\N	2026-05-21 10:11:19.437
cmpfbz7db0043zj6scdtzd44e	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-040 · RGU Ledger	/sm/tasks/cmpfbz7d40040zj6siu2i1c96	cmpfbz7d40040zj6siu2i1c96	\N	2026-05-21 10:11:19.439
cmpfbziol0048zj6sku8o3o28	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-040 · RGU Ledger	/cbo/verticals/CRT	cmpfbz7d40040zj6siu2i1c96	\N	2026-05-21 10:11:34.101
cmpfbzzkd004czj6svrzjokdh	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-041 · Table Mug	/cbo/verticals/CRT	cmpfbzzk9004bzj6swpsiqka4	\N	2026-05-21 10:11:55.982
cmpfbzzkg004ezj6slkxeoci6	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-041 · Table Mug	/sm/tasks/cmpfbzzk9004bzj6swpsiqka4	cmpfbzzk9004bzj6swpsiqka4	\N	2026-05-21 10:11:55.984
cmpfc05ri004jzj6sdoao7ty0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-041 · Table Mug	/cbo/verticals/CRT	cmpfbzzk9004bzj6swpsiqka4	\N	2026-05-21 10:12:04.015
cmpfc0xqn004nzj6sv568dvxk	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-042 · Mug	/cbo/verticals/CRT	cmpfc0xqj004mzj6sahnyt67u	\N	2026-05-21 10:12:40.272
cmpfc0xrq004pzj6so1bqxp0e	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-042 · Mug	/sm/tasks/cmpfc0xqj004mzj6sahnyt67u	cmpfc0xqj004mzj6sahnyt67u	\N	2026-05-21 10:12:40.31
cmpfc1cqp004uzj6s9p25uxjw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-042 · Mug	/cbo/verticals/CRT	cmpfc0xqj004mzj6sahnyt67u	\N	2026-05-21 10:12:59.713
cmpfc1oe2004yzj6sw5fyhfsy	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-043 · T-Shirt	/cbo/verticals/CRT	cmpfc1ody004xzj6s7ryw72px	\N	2026-05-21 10:13:14.811
cmpfc1oe60050zj6s1ykcbvmc	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-043 · T-Shirt	/sm/tasks/cmpfc1ody004xzj6s7ryw72px	cmpfc1ody004xzj6s7ryw72px	\N	2026-05-21 10:13:14.814
cmpfc1wla0055zj6sr3bs201d	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-043 · T-Shirt	/cbo/verticals/CRT	cmpfc1ody004xzj6s7ryw72px	\N	2026-05-21 10:13:25.438
cmpfc2bub0059zj6spun5ph91	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-044 · Water Bottle Branding	/cbo/verticals/CRT	cmpfc2bu10058zj6s064iho1n	\N	2026-05-21 10:13:45.204
cmpfc2bug005bzj6s1plri7v8	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-044 · Water Bottle Branding	/sm/tasks/cmpfc2bu10058zj6s064iho1n	cmpfc2bu10058zj6s064iho1n	\N	2026-05-21 10:13:45.208
cmpfc6nup005gzj6sxfrrund4	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-044 · Water Bottle Branding	/cbo/verticals/CRT	cmpfc2bu10058zj6s064iho1n	\N	2026-05-21 10:17:07.393
cmpfc71i3005kzj6syi1esf6s	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-045 · Scribbling Pad – Front Page – A5 size	/cbo/verticals/CRT	cmpfc71hy005jzj6scsls5rev	\N	2026-05-21 10:17:25.083
cmpfc71i6005mzj6sq89a6htv	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-045 · Scribbling Pad – Front Page – A5 size	/sm/tasks/cmpfc71hy005jzj6scsls5rev	cmpfc71hy005jzj6scsls5rev	\N	2026-05-21 10:17:25.086
cmpfc7ncr005tzj6s9bfs9hja	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-045 · Scribbling Pad – Front Page – A5 size	/cbo/verticals/CRT	cmpfc71hy005jzj6scsls5rev	\N	2026-05-21 10:17:53.403
cmpfca04z005xzj6sh001l82j	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-046 · ID Card – 4 × 6 inch – DELEGATE	/cbo/verticals/CRT	cmpfca04o005wzj6shjgigi7b	\N	2026-05-21 10:19:43.283
cmpfca052005zzj6sel4hv7z6	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-046 · ID Card – 4 × 6 inch – DELEGATE	/sm/tasks/cmpfca04o005wzj6shjgigi7b	cmpfca04o005wzj6shjgigi7b	\N	2026-05-21 10:19:43.286
cmpfcai5q0064zj6svqwgud8z	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-046 · ID Card – 4 × 6 inch – DELEGATE	/cbo/verticals/CRT	cmpfca04o005wzj6shjgigi7b	\N	2026-05-21 10:20:06.639
cmpfcaugi0068zj6sro1hdnun	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-047 · Lanyard – 30 × 0.75 inch	/cbo/verticals/CRT	cmpfcaugd0067zj6sqe5iq5qh	\N	2026-05-21 10:20:22.578
cmpfcaugk006azj6ss8naus9d	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-047 · Lanyard – 30 × 0.75 inch	/sm/tasks/cmpfcaugd0067zj6sqe5iq5qh	cmpfcaugd0067zj6sqe5iq5qh	\N	2026-05-21 10:20:22.58
cmpfcb5fy006fzj6szbq8hzie	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-047 · Lanyard – 30 × 0.75 inch	/cbo/verticals/CRT	cmpfcaugd0067zj6sqe5iq5qh	\N	2026-05-21 10:20:36.814
cmpfceg3l006jzj6svulxa9az	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-048 · Paper Ad	/cbo/verticals/CRT	cmpfceg3g006izj6s2sgk43p6	\N	2026-05-21 10:23:10.593
cmpfceg3n006lzj6s3ebdjrmj	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-048 · Paper Ad	/sm/tasks/cmpfceg3g006izj6s2sgk43p6	cmpfceg3g006izj6s2sgk43p6	\N	2026-05-21 10:23:10.596
cmpfcenb7006qzj6snzqnydez	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-048 · Paper Ad	/cbo/verticals/CRT	cmpfceg3g006izj6s2sgk43p6	\N	2026-05-21 10:23:19.939
cmpfcf0sn006uzj6sjgu8xoeg	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-049 · Digital invitation	/cbo/verticals/CRT	cmpfcf0sj006tzj6seumx3m7g	\N	2026-05-21 10:23:37.416
cmpfcf0sq006wzj6s50jxfj13	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-049 · Digital invitation	/sm/tasks/cmpfcf0sj006tzj6seumx3m7g	cmpfcf0sj006tzj6seumx3m7g	\N	2026-05-21 10:23:37.418
cmpfcf7dt0071zj6scpqk9dwc	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-049 · Digital invitation	/cbo/verticals/CRT	cmpfcf0sj006tzj6seumx3m7g	\N	2026-05-21 10:23:45.953
cmpfcflgd0075zj6s4m14eixg	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-050 · Three cards	/cbo/verticals/CRT	cmpfcflg90074zj6slbd41xqb	\N	2026-05-21 10:24:04.189
cmpfcflgf0077zj6s5vpuvi3r	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-050 · Three cards	/sm/tasks/cmpfcflg90074zj6slbd41xqb	cmpfcflg90074zj6slbd41xqb	\N	2026-05-21 10:24:04.191
cmpfcg1ky007ezj6ssz0binxc	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-050 · Three cards	/cbo/verticals/CRT	cmpfcflg90074zj6slbd41xqb	\N	2026-05-21 10:24:25.091
cmpfci8ld007izj6sd3x5rr9b	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-051 · Brown cover	/cbo/verticals/CRT	cmpfci8l4007hzj6s43khnz5e	\N	2026-05-21 10:26:07.489
cmpfci8lh007kzj6si7gy4mt9	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-051 · Brown cover	/sm/tasks/cmpfci8l4007hzj6s43khnz5e	cmpfci8l4007hzj6s43khnz5e	\N	2026-05-21 10:26:07.494
cmpfcigst007pzj6soqutx5ae	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	CRT-051 · Brown cover	/cbo/verticals/CRT	cmpfci8l4007hzj6s43khnz5e	\N	2026-05-21 10:26:18.125
cmpfcosee007tzj6spjrbwbp6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-063 · Printed Diary for Academician	/cbo/verticals/RGU	cmpfcose3007szj6sqfa9w92a	\N	2026-05-21 10:31:13.094
cmpfcoseh007vzj6s576uw5xy	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-063 · Printed Diary for Academician	/sm/tasks/cmpfcose3007szj6sqfa9w92a	cmpfcose3007szj6sqfa9w92a	\N	2026-05-21 10:31:13.097
cmpfcp3400080zj6s3bbdk7yb	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-063 · Printed Diary for Academician	/cbo/verticals/RGU	cmpfcose3007szj6sqfa9w92a	\N	2026-05-21 10:31:26.976
cmpfcwkzx0084zj6sm3buqwg4	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-064 · Printed Diary for Corporate	/cbo/verticals/RGU	cmpfcwkzl0083zj6syid80ji3	\N	2026-05-21 10:37:16.749
cmpfcwl000086zj6snbr05ryi	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-064 · Printed Diary for Corporate	/sm/tasks/cmpfcwkzl0083zj6syid80ji3	cmpfcwkzl0083zj6syid80ji3	\N	2026-05-21 10:37:16.753
cmpfcwslq008bzj6sfe9ht5iv	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RGU-064 · Printed Diary for Corporate	/cbo/verticals/RGU	cmpfcwkzl0083zj6syid80ji3	\N	2026-05-21 10:37:26.607
cmpfet8i6008fzj6s1pqc6b7c	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-016 · Preparation for Minor Degree Program and Student Offerings for 2nd & 3rd Year Student- Krishnaraj	/cbo/verticals/RTC	cmpfet8hv008ezj6ss9vbk6ms	\N	2026-05-21 11:30:39.822
cmpfet8ia008hzj6sdi5ntzr4	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-016 · Preparation for Minor Degree Program and Student Offerings for 2nd & 3rd Year Student- Krishnaraj	/sm/tasks/cmpfet8hv008ezj6ss9vbk6ms	cmpfet8hv008ezj6ss9vbk6ms	\N	2026-05-21 11:30:39.826
cmpgjtvbg0003s5dbda9nwc10	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-017 · M-lab location rename Room Allocation - Block Drawing - Krishnaraj	/cbo/verticals/RTC	cmpgjtvb10002s5db01b4ovs5	\N	2026-05-22 06:38:53.644
cmpgjtvbo0005s5dbfqowbdpn	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-017 · M-lab location rename Room Allocation - Block Drawing - Krishnaraj	/sm/tasks/cmpgjtvb10002s5db01b4ovs5	cmpgjtvb10002s5db01b4ovs5	\N	2026-05-22 06:38:53.652
cmphutioq0003pua1vg1i18fo	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-075 · Zomato Ad  - Magala	/cbo/verticals/MKT	cmphutio60002pua1o97gj4or	\N	2026-05-23 04:34:19.226
cmphutioy0005pua1e9nvmngq	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-075 · Zomato Ad  - Magala	/sm/tasks/cmphutio60002pua1o97gj4or	cmphutio60002pua1o97gj4or	\N	2026-05-23 04:34:19.235
cmphuxah4000bpua1bl6xhxfe	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-076 · Campaign for Bharathiyar Universtiy Data - Pandi, Megala	/cbo/verticals/MKT	cmphuxagz000apua17ulbl6vy	\N	2026-05-23 04:37:15.208
cmphuxah7000dpua1f0z7r8p8	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-076 · Campaign for Bharathiyar Universtiy Data - Pandi, Megala	/sm/tasks/cmphuxagz000apua17ulbl6vy	cmphuxagz000apua17ulbl6vy	\N	2026-05-23 04:37:15.211
cmphv0uyz000jpua1ipjavoj5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-077 · Sir B.Com Vedio  Ad runnig  impact - Megala	/cbo/verticals/MKT	cmphv0uym000ipua1oq8ukdpv	\N	2026-05-23 04:40:01.739
cmphv0uz2000lpua1rjyqxuaj	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-077 · Sir B.Com Vedio  Ad runnig  impact - Megala	/sm/tasks/cmphv0uym000ipua1oq8ukdpv	cmphv0uym000ipua1oq8ukdpv	\N	2026-05-23 04:40:01.742
cmphv300d000rpua1w6ivbd68	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-065 · SIM Card Purchase - Ramesh	/cbo/verticals/RGU	cmphv3006000qpua11czbfvsn	\N	2026-05-23 04:41:41.582
cmphv300f000tpua10k714m37	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-065 · SIM Card Purchase - Ramesh	/sm/tasks/cmphv3006000qpua11czbfvsn	cmphv3006000qpua11czbfvsn	\N	2026-05-23 04:41:41.584
cmphv4dlj000zpua18g1t3718	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-078 · MBA Brochure - pandi	/cbo/verticals/MKT	cmphv4dle000ypua174r31sda	\N	2026-05-23 04:42:45.847
cmphv4dll0011pua1v4u4ql7q	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-078 · MBA Brochure - pandi	/sm/tasks/cmphv4dle000ypua174r31sda	cmphv4dle000ypua174r31sda	\N	2026-05-23 04:42:45.85
cmphvjan60014pua15uxmnlkn	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-075 · Zomato Ad  - Magala	/cbo/verticals/MKT	cmphutio60002pua1o97gj4or	\N	2026-05-23 04:54:21.858
cmphvjlf70017pua1f2rqgc5n	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-075 · Zomato Ad  - Magala	/cbo/verticals/MKT	cmphutio60002pua1o97gj4or	\N	2026-05-23 04:54:35.827
cmpkqd6i00002qefwkbdruten	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-075 · Zomato Ad  - meghala	/cbo/verticals/MKT	cmphutio60002pua1o97gj4or	\N	2026-05-25 04:52:57
cmpkqeeie0005qefwjbq6o8eq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-077 · Sir B.Com Video  Ad runnig  impact - meghala	/cbo/verticals/MKT	cmphv0uym000ipua1oq8ukdpv	\N	2026-05-25 04:53:54.038
cmpkqis0v0008qefwghbdw4g8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-076 · Campaign for Bharathiyar Universtiy Data - Pandi, meghala	/cbo/verticals/MKT	cmphuxagz000apua17ulbl6vy	\N	2026-05-25 04:57:18.175
cmpkqiwdr000cqefwg0chhsmr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-079 · Digital Marketing Plan for MBA & MCA	/cbo/verticals/MKT	cmpkqiwda000bqefw7kjjtp6d	\N	2026-05-25 04:57:23.823
cmpkqiwdu000eqefwzclshl26	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-079 · Digital Marketing Plan for MBA & MCA	/sm/tasks/cmpkqiwda000bqefw7kjjtp6d	cmpkqiwda000bqefw7kjjtp6d	\N	2026-05-25 04:57:23.826
cmpkqla5z000jqefw7p1xgwl8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-078 · MBA Brochure - pandi	/cbo/verticals/MKT	cmphv4dle000ypua174r31sda	\N	2026-05-25 04:59:14.999
cmpkqljo7000mqefwiue30mux	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-078 · MBA Brochure - pandi	/cbo/verticals/MKT	cmphv4dle000ypua174r31sda	\N	2026-05-25 04:59:27.319
cmpkqn5uh000pqefwh0m16ym7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-052 · Corporate & Academic Council Thank You Poster - Krishnaraj	/cbo/verticals/RGU	cmpfa2oat000izj6s6p58dzvq	\N	2026-05-25 05:00:42.713
cmpkqp8xj000sqefwa7qc778o	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-078 · MBA Brochure - pandi	/cbo/verticals/MKT	cmphv4dle000ypua174r31sda	\N	2026-05-25 05:02:20.024
cmpkqpona000vqefwq2c0rwld	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-076 · Campaign for Bharathiyar Universtiy Data - Pandi, meghala	/cbo/verticals/MKT	cmphuxagz000apua17ulbl6vy	\N	2026-05-25 05:02:40.39
cmpkqpyiu000wqefw2u3kp18f	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-077 · Sir B.Com Video  Ad runnig  impact - meghala	/cbo/verticals/MKT	cmphv0uym000ipua1oq8ukdpv	\N	2026-05-25 05:02:53.191
cmpkqq8x9000zqefw8m9a038x	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	MKT-077 · Sir B.Com Video  Ad runnig  impact - meghala	/cbo/verticals/MKT	cmphv0uym000ipua1oq8ukdpv	\N	2026-05-25 05:03:06.67
cmpkqrcnx0012qefw4ycyo5v7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-075 · Zomato Ad  - meghala	/cbo/verticals/MKT	cmphutio60002pua1o97gj4or	\N	2026-05-25 05:03:58.173
cmpkqrmxn0015qefwyiihbi0u	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RTC	RTC-017 · M-lab location rename Room Allocation - Block Drawing - Krishnaraj	/cbo/verticals/RTC	cmpgjtvb10002s5db01b4ovs5	\N	2026-05-25 05:04:11.484
cmpkqsfz60019qefw3vjz8636	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-080 · Daily status of Untouched leads	/cbo/verticals/MKT	cmpkqsfyr0018qefwnqsa8a2c	\N	2026-05-25 05:04:49.123
cmpkqsfza001bqefw12q2rvyn	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-080 · Daily status of Untouched leads	/sm/tasks/cmpkqsfyr0018qefwnqsa8a2c	cmpkqsfyr0018qefwnqsa8a2c	\N	2026-05-25 05:04:49.126
cmpkqu2j3001gqefwc30k0onq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	CRT-051 · Brown cover	/cbo/verticals/CRT	cmpfci8l4007hzj6s43khnz5e	\N	2026-05-25 05:06:05.007
cmpkqvwn3001jqefwpmb93qt0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-064 · Printed Diary for Corporate	/cbo/verticals/RGU	cmpfcwkzl0083zj6syid80ji3	\N	2026-05-25 05:07:30.688
cmpkqwd9y001mqefw8ue77cqx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-063 · Printed Diary for Academician	/cbo/verticals/RGU	cmpfcose3007szj6sqfa9w92a	\N	2026-05-25 05:07:52.246
cmpkqwmg9001pqefw5juei0ab	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	CRT-048 · Paper Ad	/cbo/verticals/CRT	cmpfceg3g006izj6s2sgk43p6	\N	2026-05-25 05:08:04.138
cmpl5b8660002o3hndtz803qp	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	CRT-044 · Water Bottle Branding	/cbo/verticals/CRT	cmpfc2bu10058zj6s064iho1n	\N	2026-05-25 11:51:20.095
cmpl5cuoq0003o3hno2c4tx42	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Creative	CRT-044 · Water Bottle Branding	/cbo/verticals/CRT	cmpfc2bu10058zj6s064iho1n	\N	2026-05-25 11:52:35.931
cmpnldm0b000mo3hn7dkmqnvz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-081 · posters for courses with less admission - pandi	/cbo/verticals/MKT	cmpnldm02000lo3hn4chmma33	\N	2026-05-27 04:56:37.548
cmpnldm0f000oo3hn30q3tfll	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-081 · posters for courses with less admission - pandi	/sm/tasks/cmpnldm02000lo3hn4chmma33	cmpnldm02000lo3hn4chmma33	\N	2026-05-27 04:56:37.551
cmpnlg6gl000uo3hn1irdiqmo	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-082 · Viscom sathish-School brochure(2)	/cbo/verticals/MKT	cmpnlg6gb000to3hnewn024ck	\N	2026-05-27 04:58:37.366
cmpnlg6gq000wo3hnp8oi3rz9	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-082 · Viscom sathish-School brochure(2)	/sm/tasks/cmpnlg6gb000to3hnewn024ck	cmpnlg6gb000to3hnewn024ck	\N	2026-05-27 04:58:37.37
cmpnn1vvc000zo3hnmqufijgi	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-081 · posters for courses with less admission - pandi	/cbo/verticals/MKT	cmpnldm02000lo3hn4chmma33	\N	2026-05-27 05:43:29.688
cmprxwnxf0013o3hn00c90t84	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-083 · Post Admission Process to be reviewed	/cbo/verticals/MKT	cmprxwnx20012o3hnb5m39hy7	\N	2026-05-30 05:58:26.596
cmprxwnxj0015o3hnjkfg47fs	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-083 · Post Admission Process to be reviewed	/sm/tasks/cmprxwnx20012o3hnb5m39hy7	cmprxwnx20012o3hnb5m39hy7	\N	2026-05-30 05:58:26.599
cmpry4i0q001bo3hn6u8lwxca	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-084 · Concession for High cutoff seats and whatsapp push	/cbo/verticals/MKT	cmpry4i0f001ao3hnutxvgk18	\N	2026-05-30 06:04:32.186
cmpry4i0t001do3hnt7g29dbu	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-084 · Concession for High cutoff seats and whatsapp push	/sm/tasks/cmpry4i0f001ao3hnutxvgk18	cmpry4i0f001ao3hnutxvgk18	\N	2026-05-30 06:04:32.19
cmpryjcos001jo3hn7beljtuj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-085 · Full seat concession for accountancy	/cbo/verticals/MKT	cmpryjcoj001io3hn8v7n13dn	\N	2026-05-30 06:16:05.116
cmpryjcow001lo3hnuem5ws8h	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-085 · Full seat concession for accountancy	/sm/tasks/cmpryjcoj001io3hn8v7n13dn	cmpryjcoj001io3hn8v7n13dn	\N	2026-05-30 06:16:05.12
cmprykt86001ro3hnguht18hi	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-086 · Pure B.Com with Integrated CA training (Target 200 seats)	/cbo/verticals/MKT	cmprykt7x001qo3hn8p7h4nww	\N	2026-05-30 06:17:13.206
cmprykt88001to3hngl1o2o1o	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-086 · Pure B.Com with Integrated CA training (Target 200 seats)	/sm/tasks/cmprykt7x001qo3hn8p7h4nww	cmprykt7x001qo3hn8p7h4nww	\N	2026-05-30 06:17:13.208
cmprymbb8001zo3hn3m8l4kd0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-087 · Ad initiation for Counselling Psychology and PGDM	/cbo/verticals/MKT	cmprymbb3001yo3hn22w5etc7	\N	2026-05-30 06:18:23.301
cmprymbbb0021o3hneglzq9rw	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-087 · Ad initiation for Counselling Psychology and PGDM	/sm/tasks/cmprymbb3001yo3hn22w5etc7	cmprymbb3001yo3hn22w5etc7	\N	2026-05-30 06:18:23.303
cmpryn6i20027o3hn1gyutyk2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-088 · Name change of  MA Journalism & Mass communication	/cbo/verticals/MKT	cmpryn6hw0026o3hn5hxdebwc	\N	2026-05-30 06:19:03.722
cmpryn6i40029o3hne7jpc4fe	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-088 · Name change of  MA Journalism & Mass communication	/sm/tasks/cmpryn6hw0026o3hn5hxdebwc	cmpryn6hw0026o3hn5hxdebwc	\N	2026-05-30 06:19:03.724
cmpryo5fz002fo3hnqtra9o6d	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-089 · Sports quota can be given for MBA IEV	/cbo/verticals/MKT	cmpryo5fv002eo3hnxrep0wy8	\N	2026-05-30 06:19:49.008
cmpryo5g1002ho3hnyi18wp38	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-089 · Sports quota can be given for MBA IEV	/sm/tasks/cmpryo5fv002eo3hnxrep0wy8	cmpryo5fv002eo3hnxrep0wy8	\N	2026-05-30 06:19:49.01
cmpryoz9k002no3hn7oo6jol9	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-090 · Individual analysis on 45 dropouts	/cbo/verticals/MKT	cmpryoz9f002mo3hnnaxdgaih	\N	2026-05-30 06:20:27.656
cmpryoz9m002po3hn2yb9yfu0	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-090 · Individual analysis on 45 dropouts	/sm/tasks/cmpryoz9f002mo3hnnaxdgaih	cmpryoz9f002mo3hnnaxdgaih	\N	2026-05-30 06:20:27.659
cmpryppxn002uo3hnfa5fzek6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in Marketing	MKT-090 · Individual analysis on 45 dropouts	/cbo/verticals/MKT	cmpryoz9f002mo3hnnaxdgaih	\N	2026-05-30 06:21:02.219
cmpryqf1t002yo3hn9s6cidj6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-091 · Increase admission for lateral entry	/cbo/verticals/MKT	cmpryqf1j002xo3hnuce4cxme	\N	2026-05-30 06:21:34.769
cmpryqf1w0030o3hnt9mg7ysl	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-091 · Increase admission for lateral entry	/sm/tasks/cmpryqf1j002xo3hnuce4cxme	cmpryqf1j002xo3hnuce4cxme	\N	2026-05-30 06:21:34.772
cmpryrktu0036o3hnd7zaozzb	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-092 · Increase ad for MCA and promote MCA among RCAS RSmart CSE Courses	/cbo/verticals/MKT	cmpryrktn0035o3hnf705olzi	\N	2026-05-30 06:22:28.914
cmpryrktw0038o3hn9clkcz5b	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-092 · Increase ad for MCA and promote MCA among RCAS RSmart CSE Courses	/sm/tasks/cmpryrktn0035o3hnf705olzi	cmpryrktn0035o3hnf705olzi	\N	2026-05-30 06:22:28.917
cmprysoac003eo3hnws8tk4lt	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-093 · Ad can be initiated for SRIET and some budget can be alloted	/cbo/verticals/MKT	cmprysoa8003do3hn48t4lij2	\N	2026-05-30 06:23:20.052
cmprysoae003go3hnx9d2pzr3	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-093 · Ad can be initiated for SRIET and some budget can be alloted	/sm/tasks/cmprysoa8003do3hn48t4lij2	cmprysoa8003do3hn48t4lij2	\N	2026-05-30 06:23:20.054
cmpryugt0003mo3hn58ynhb2w	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-094 · Consultant admission for SRIET,Viscom,CDF and 45L budget is available	/cbo/verticals/MKT	cmpryugsw003lo3hntfyj7ovp	\N	2026-05-30 06:24:43.669
cmpryugt3003oo3hnbrr7zihm	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-094 · Consultant admission for SRIET,Viscom,CDF and 45L budget is available	/sm/tasks/cmpryugsw003lo3hntfyj7ovp	cmpryugsw003lo3hntfyj7ovp	\N	2026-05-30 06:24:43.671
cmprywehx003uo3hnk9iir522	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-095 · Separate page for each school in RGU website  and fix deadlines	/cbo/verticals/MKT	cmpryweht003to3hnyf1frf4e	\N	2026-05-30 06:26:13.989
cmprywehz003wo3hnntcfsi7z	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-095 · Separate page for each school in RGU website  and fix deadlines	/sm/tasks/cmpryweht003to3hnyf1frf4e	cmpryweht003to3hnyf1frf4e	\N	2026-05-30 06:26:13.991
cmpryx73q0042o3hni7si2mxw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-096 · Walkin postmortem	/cbo/verticals/MKT	cmpryx73h0041o3hnkstx56ae	\N	2026-05-30 06:26:51.063
cmpryx73v0044o3hnu5dwo3xr	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-096 · Walkin postmortem	/sm/tasks/cmpryx73h0041o3hnkstx56ae	cmpryx73h0041o3hnkstx56ae	\N	2026-05-30 06:26:51.067
cmps0qee5000bheom9fg2gmlr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-001 · Testing mail	/cbo/verticals/RAALE	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 07:17:33.15
cmps0qeed000dheomjtk3dogy	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-001 · Testing mail	/sm/tasks/cmps0qedw000aheomdt7pzse0	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 07:17:33.157
cmps0si32000kheom6bk6lv58	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → IN PROGRESS	RAALE-001 · Testing mail	/cbo/verticals/RAALE	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 07:19:11.246
cmps0t1pc000lheomw3es592h	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RAALE - Learning Ecosystem	RAALE-001 · Testing mail	/cbo/verticals/RAALE	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 07:19:36.672
cmps3mhli0002sn4evktomq0i	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → WAITING FOR APPROVAL	RAALE-001 · Testing mail	/cbo/verticals/RAALE	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 08:38:29.526
cmps47a6s0005sn4efx85e9ph	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RAALE-001 · Testing mail	/cbo/verticals/RAALE	cmps0qedw000aheomdt7pzse0	\N	2026-05-30 08:54:39.701
cmpsjsylk00032qldj9es5vx5	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 16:11:25.353
cmpsjsyls00052qldbbbm5pr5	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-001 · Test	/sm/tasks/cmpsjsyl300022qlda9e5b8sf	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 16:11:25.36
cmpsjwiw3000a2qld12nd32rs	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → IN PROGRESS	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 16:14:11.619
cmpsowaqw0002p8dthika3v8r	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → WAITING FOR APPROVAL	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 18:33:59.144
cmpsownap0007p8dtaf3clwdv	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → DELAYED	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 18:34:15.41
cmpsowu44000ap8dtzfq1nh48	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → COMPLETED	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 18:34:24.244
cmpsowz4r000dp8dt9k1owyh8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → IN PROGRESS	RAALE-001 · Test	/cbo/verticals/RAALE	cmpsjsyl300022qlda9e5b8sf	\N	2026-05-30 18:34:30.747
cmpsozbkv000hp8dtdi50i8ko	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-002 · Testing mail communication	/cbo/verticals/RAALE	cmpsozbkq000gp8dt5fskv8i3	\N	2026-05-30 18:36:20.192
cmpsozbky000jp8dtmi2sda5n	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-002 · Testing mail communication	/sm/tasks/cmpsozbkq000gp8dt5fskv8i3	cmpsozbkq000gp8dt5fskv8i3	\N	2026-05-30 18:36:20.194
cmpsp0vbf000op8dtxno1xdoi	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → IN PROGRESS	RAALE-002 · Testing mail communication	/cbo/verticals/RAALE	cmpsozbkq000gp8dt5fskv8i3	\N	2026-05-30 18:37:32.427
cmpsp1p3q000rp8dtvbrnazk6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Status → DELAYED	RAALE-002 · Testing mail communication	/cbo/verticals/RAALE	cmpsozbkq000gp8dt5fskv8i3	\N	2026-05-30 18:38:11.03
cmpuqw89h001cp8dtdmatco83	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Placements	PLC-009 · Entry of leads in the CRM & code generation for every company	/cbo/verticals/PLC	cmpuqw899001bp8dtudtx5te2	\N	2026-06-01 05:05:27.509
cmpuqw89l001ep8dto4mpggbz	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Placements	PLC-009 · Entry of leads in the CRM & code generation for every company	/sm/tasks/cmpuqw899001bp8dtudtx5te2	cmpuqw899001bp8dtudtx5te2	\N	2026-06-01 05:05:27.513
cmpurcb76002ep8dtg4l174as	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Placements	PLC-010 · RGU Placement SOP	/cbo/verticals/PLC	cmpurcb6w002dp8dt7yh2bsa0	\N	2026-06-01 05:17:57.81
cmpurcb79002gp8dtoobbocff	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Placements	PLC-010 · RGU Placement SOP	/sm/tasks/cmpurcb6w002dp8dt7yh2bsa0	cmpurcb6w002dp8dt7yh2bsa0	\N	2026-06-01 05:17:57.814
cmpurjy8v002np8dto1ao5mqn	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-042 · Paper ad for RGU launch	/cbo/verticals/RGU	cmol17wd3006klltvk73gxk83	\N	2026-06-01 05:23:54.271
cmpv3cc2c0003zsl61vruq6p2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Special Strategic Projects	SSP-001 · MBA Brochure	/cbo/verticals/SSP	cmpv3cc1p0002zsl63cvbi0he	\N	2026-06-01 10:53:54.324
cmpv3cc2m0005zsl6n0xjln97	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Special Strategic Projects	SSP-001 · MBA Brochure	/sm/tasks/cmpv3cc1p0002zsl63cvbi0he	cmpv3cc1p0002zsl63cvbi0he	\N	2026-06-01 10:53:54.334
cmpw052sv0003nlreob9p35qj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Registrar	REG-002 · Test Task	/cbo/verticals/REG	cmpw052rd0002nlred0znzt9b	\N	2026-06-02 02:12:03.056
cmpw052t90005nlred1uges2z	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Registrar	REG-002 · Test Task	/sm/tasks/cmpw052rd0002nlred0znzt9b	cmpw052rd0002nlred0znzt9b	\N	2026-06-02 02:12:03.07
cmq0vp5iu000bnlrexxbtgfk6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-018 · Corporate Brochure	/cbo/verticals/RTC	cmq0vp5ie000anlrezeaf6fvx	\N	2026-06-05 12:06:32.503
cmq0vp5iz000dnlrebf06xrnu	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-018 · Corporate Brochure	/sm/tasks/cmq0vp5ie000anlrezeaf6fvx	cmq0vp5ie000anlrezeaf6fvx	\N	2026-06-05 12:06:32.507
cmq0vvfdx000inlre8skpyrbz	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RTC	RTC-018 · Corporate Brochure	/cbo/verticals/RTC	cmq0vp5ie000anlrezeaf6fvx	\N	2026-06-05 12:11:25.222
cmq1zgude000mnlrebt07ovis	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-019 · AI assisted teaching  - Dr. Arun	/cbo/verticals/RTC	cmq1zgucx000lnlrepx4yrq4i	\N	2026-06-06 06:39:49.442
cmq1zgudi000onlre90fa5dqz	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RTC	RTC-019 · AI assisted teaching  - Dr. Arun	/sm/tasks/cmq1zgucx000lnlrepx4yrq4i	cmq1zgucx000lnlrepx4yrq4i	\N	2026-06-06 06:39:49.447
cmq2990es000unlrerc5qobog	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-052 · chairman sir profile correction	/cbo/verticals/CRT	cmq2990eg000tnlreiiooserz	\N	2026-06-06 11:13:40.18
cmq2990ew000wnlre0npgm5ds	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Creative	CRT-052 · chairman sir profile correction	/sm/tasks/cmq2990eg000tnlreiiooserz	cmq2990eg000tnlreiiooserz	\N	2026-06-06 11:13:40.185
cmq57fwdr0012nlrejvx0g26r	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-066 · Scholarship Target English-25 , Maths and Physic -50  - Pandi, Ramesh	/cbo/verticals/RGU	cmq57fwdb0011nlre6xctwu7g	\N	2026-06-08 12:46:20.848
cmq57fwdv0014nlrehbj9p4js	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-066 · Scholarship Target English-25 , Maths and Physic -50  - Pandi, Ramesh	/sm/tasks/cmq57fwdb0011nlre6xctwu7g	cmq57fwdb0011nlre6xctwu7g	\N	2026-06-08 12:46:20.852
cmq57h13h001anlren4h2gph2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-097 · PGDM ad running - Meghala	/cbo/verticals/MKT	cmq57h13a0019nlrejtmle83m	\N	2026-06-08 12:47:13.614
cmq57h13k001cnlreza678wuk	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-097 · PGDM ad running - Meghala	/sm/tasks/cmq57h13a0019nlrejtmle83m	cmq57h13a0019nlrejtmle83m	\N	2026-06-08 12:47:13.616
cmq584ycp001inlre57zi9npr	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-098 · Walkin Dashboard - Maghala	/cbo/verticals/MKT	cmq584ycb001hnlrehrn5g1c1	\N	2026-06-08 13:05:49.801
cmq584ycx001knlre3ymtx3f1	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-098 · Walkin Dashboard - Maghala	/sm/tasks/cmq584ycb001hnlrehrn5g1c1	cmq584ycb001hnlrehrn5g1c1	\N	2026-06-08 13:05:49.81
cmq58c4l5001qnlreblp42cbj	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-099 · Bharathiyar university Data Dshboard - Meghala	/cbo/verticals/MKT	cmq58c4kq001pnlres3zw0z7z	\N	2026-06-08 13:11:24.473
cmq58c4lb001snlreg748w8lu	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-099 · Bharathiyar university Data Dshboard - Meghala	/sm/tasks/cmq58c4kq001pnlres3zw0z7z	cmq58c4kq001pnlres3zw0z7z	\N	2026-06-08 13:11:24.479
cmq58de2j001ynlreaeqdtwts	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-100 · Alumni Scholarship - Pandi	/cbo/verticals/MKT	cmq58de2a001xnlreupd44uws	\N	2026-06-08 13:12:23.419
cmq58de2m0020nlrey0qcmsfr	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-100 · Alumni Scholarship - Pandi	/sm/tasks/cmq58de2a001xnlreupd44uws	cmq58de2a001xnlreupd44uws	\N	2026-06-08 13:12:23.422
cmq7n8f5g0026nlrevj8eft80	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-003 · SOP for Growth card and Skill Passport	/cbo/verticals/RAALE	cmq7n8f510025nlre1w31hx79	\N	2026-06-10 05:43:58.133
cmq7n8f5n0028nlreuai9wvbf	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RAALE - Learning Ecosystem	RAALE-003 · SOP for Growth card and Skill Passport	/sm/tasks/cmq7n8f510025nlre1w31hx79	cmq7n8f510025nlre1w31hx79	\N	2026-06-10 05:43:58.14
cmq7nafgb002enlrei1jhw1dp	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-101 · Increase lead generation for RPET,RSAT	/cbo/verticals/MKT	cmq7naffz002dnlreb7zuqr4s	\N	2026-06-10 05:45:31.835
cmq7nafgg002gnlreet8074tk	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-101 · Increase lead generation for RPET,RSAT	/sm/tasks/cmq7naffz002dnlreb7zuqr4s	cmq7naffz002dnlreb7zuqr4s	\N	2026-06-10 05:45:31.84
cmq7nlf64002vnlreukdwgcw2	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RAALE - Learning Ecosystem	RAALE-003 · SOP for Growth card and Skill Passport	/cbo/verticals/RAALE	cmq7n8f510025nlre1w31hx79	\N	2026-06-10 05:54:04.666
cmq7nm47q002ynlreb1waapkl	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-100 · Alumni Scholarship - Pandi	/cbo/verticals/MKT	cmq58de2a001xnlreupd44uws	\N	2026-06-10 05:54:37.142
cmq7nmzak0031nlre358s48tq	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-099 · Bharathiyar university Data Dshboard - Meghala	/cbo/verticals/MKT	cmq58c4kq001pnlres3zw0z7z	\N	2026-06-10 05:55:17.42
cmq7nnse60034nlrelfih7og7	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-099 · Bharathiyar university Data Dshboard	/cbo/verticals/MKT	cmq58c4kq001pnlres3zw0z7z	\N	2026-06-10 05:55:55.135
cmq7no3v60037nlrew259mlr8	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-100 · Alumni Scholarship	/cbo/verticals/MKT	cmq58de2a001xnlreupd44uws	\N	2026-06-10 05:56:10.003
cmq7nokqq003anlreer7xqias	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-098 · Walkin Dashboard	/cbo/verticals/MKT	cmq584ycb001hnlrehrn5g1c1	\N	2026-06-10 05:56:31.874
cmq7np17p003dnlre23klvgnv	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-097 · PGDM ad running - Meghala	/cbo/verticals/MKT	cmq57h13a0019nlrejtmle83m	\N	2026-06-10 05:56:53.222
cmq7nq0zo003gnlreyi0q7fj0	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-066 · Scholarship Target English-25 , Maths and Physic -50  - Pandi, Ramesh	/cbo/verticals/RGU	cmq57fwdb0011nlre6xctwu7g	\N	2026-06-10 05:57:39.588
cmq7nqsdp003jnlrey5vwnyt4	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Creative	CRT-052 · Chairman sir profile correction	/cbo/verticals/CRT	cmq2990eg000tnlreiiooserz	\N	2026-06-10 05:58:15.086
cmq7nrcto003mnlremotod8z0	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RTC	RTC-019 · AI assisted teaching	/cbo/verticals/RTC	cmq1zgucx000lnlrepx4yrq4i	\N	2026-06-10 05:58:41.58
cmq7ns34f003pnlretacdbqqu	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RTC-018 · Corporate Brochure	/cbo/verticals/RGU	cmq0vp5ie000anlrezeaf6fvx	\N	2026-06-10 05:59:15.663
cmq7nvywt003ynlrebt0luzcl	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-090 · Individual analysis on 45 dropouts	/cbo/verticals/MKT	cmpryoz9f002mo3hnnaxdgaih	\N	2026-06-10 06:02:16.81
cmq7nwhir0041nlrerhd0zk8t	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → COMPLETED	MKT-082 · Viscom sathish-School brochure(2)	/cbo/verticals/MKT	cmpnlg6gb000to3hnewn024ck	\N	2026-06-10 06:02:40.948
cmq7nx0lf0044nlre7ruugnx1	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → COMPLETED	MKT-096 · Walkin postmortem	/cbo/verticals/MKT	cmpryx73h0041o3hnkstx56ae	\N	2026-06-10 06:03:05.668
cmq7nxrpc0047nlrevzy0obhg	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-081 · posters for courses with less admission - pandi	/cbo/verticals/MKT	cmpnldm02000lo3hn4chmma33	\N	2026-06-10 06:03:40.8
cmq7nylef004anlrefskiieju	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-065 · SIM Card Purchase - Ramesh	/cbo/verticals/RGU	cmphv3006000qpua11czbfvsn	\N	2026-06-10 06:04:19.287
cmq7nzdci004dnlren9nzl26q	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → COMPLETED	RTC-016 · Preparation for Minor Degree Program and Student Offerings for 2nd & 3rd Year Student- Krishnaraj	/cbo/verticals/RTC	cmpfet8hv008ezj6ss9vbk6ms	\N	2026-06-10 06:04:55.507
cmq7nzzx9004gnlre6t46fu82	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-079 · Digital Marketing Plan for MBA & MCA	/cbo/verticals/MKT	cmpkqiwda000bqefw7kjjtp6d	\N	2026-06-10 06:05:24.765
cmq7o0l5x004jnlrekb5i0ku1	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-053 · Hoarding for RGU with Jasmine advertisement - Pandi	/cbo/verticals/RGU	cmpfacacy0011zj6s66ij16ka	\N	2026-06-10 06:05:52.293
cmq7o1v9q004onlreigjs8ni7	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	REG-001 · Corporate & Academic Council Create a On Boarding poster	/cbo/verticals/RGU	cmpfa4y3z000qzj6sjx7ty4bu	\N	2026-06-10 06:06:52.047
cmq7o3a1y004tnlresxx4nwcb	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-050 · Times Now Promotion Plan-Viscom Sathish	/cbo/verticals/RGU	cmpf9jmvi0002zj6s9wk6za3r	\N	2026-06-10 06:07:57.862
cmq7o4jbh004ynlregncyiyjx	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-074 · Change of flex in front of College(pharm and physio) to RGU	/cbo/verticals/MKT	cmp3mbnx8003c5tvma6wxrd37	\N	2026-06-10 06:08:56.526
cmq7o5bf50053nlrek2tz7ijb	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-023 · School & RGU Flags Raised	/cbo/verticals/RGU	cmol0namz002klltv53v7voiu	\N	2026-06-10 06:09:32.945
cmq7o7rah005enlreq72l6k1r	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → PARKED	RGU-019 · Online Presentation for Google AI CoE	/cbo/verticals/RGU	cmokzwsjv001f54jt5w5et3uh	\N	2026-06-10 06:11:26.825
cmq7o80b0005hnlrel2cux53k	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-019 · Online Presentation for Google AI CoE	/cbo/verticals/RGU	cmokzwsjv001f54jt5w5et3uh	\N	2026-06-10 06:11:38.508
cmq7o8s6u005knlre0yathp3h	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-06-10 06:12:14.647
cmq7o9mg5005pnlre2vqdevqv	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → PARKED	MKT-063 · Webinar for Commerce hot,warm & col leads	/cbo/verticals/MKT	cmol4kulc008xlltv54vb97a6	\N	2026-06-10 06:12:53.861
cmq7oad4o005snlre7u4nuobo	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-018 · Meeting for IT Server for RSmart classes with IT team	/cbo/verticals/RGU	cmokzshsf001354jtd0pmqgwl	\N	2026-06-10 06:13:28.44
cmq7ob3ta005vnlrevnuwhwrk	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-045 · Reel and Webinar sent to biology students in Raw data campaign	/cbo/verticals/MKT	cmokzhm2c000954jt2as9x713	\N	2026-06-10 06:14:03.022
cmq7obzci005ynlretmlgp1hg	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-012 · Online meeting with HBS with MBA leader	/cbo/verticals/RGU	cmok2s20r002up2zxw7td5pdy	\N	2026-06-10 06:14:43.89
cmq7ocpde0061nlrer2wo5xy9	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-052 · Corporate & Academic Council Thank You Poster - Krishnaraj	/cbo/verticals/RGU	cmpfa2oat000izj6s6p58dzvq	\N	2026-06-10 06:15:17.618
cmq7od7600064nlreop1eyre3	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → COMPLETED	MKT-012 · HE / ME / LE course classification	/cbo/verticals/MKT	cmoj2rf38003lxk855f325tfs	\N	2026-06-10 06:15:40.68
cmq7oe7hd0069nlregymusv9s	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-101 · Increase lead generation for RPET,RSAT	/cbo/verticals/MKT	cmq7naffz002dnlreb7zuqr4s	\N	2026-06-10 06:16:27.745
cmq7ohhpv006gnlre653ofm40	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Placements	PLC-009 · Entry of leads in the CRM & code generation for every company	/cbo/verticals/PLC	cmpuqw899001bp8dtudtx5te2	\N	2026-06-10 06:19:00.98
cmq7oge1g006dnlresjr6otxe	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Placements	PLC-010 · RGU Placement SOP	/cbo/verticals/PLC	cmpurcb6w002dp8dt7yh2bsa0	\N	2026-06-10 06:18:09.557
cmq7oi5ux006jnlres3baizgx	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-095 · Separate page for each school in RGU website  and fix deadlines	/cbo/verticals/MKT	cmpryweht003to3hnyf1frf4e	\N	2026-06-10 06:19:32.265
cmq7oivim006mnlre8s7rp5yz	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-094 · Consultant admission for SRIET,Viscom,CDF and 45L budget is available	/cbo/verticals/MKT	cmpryugsw003lo3hntfyj7ovp	\N	2026-06-10 06:20:05.519
cmq7ojh04006pnlremdj0n6pd	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-093 · Ad can be initiated for SRIET and some budget can be alloted	/cbo/verticals/MKT	cmprysoa8003do3hn48t4lij2	\N	2026-06-10 06:20:33.364
cmq7ojujd006snlremx2eqjwl	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-088 · Name change of  MA Journalism & Mass communication	/cbo/verticals/MKT	cmpryn6hw0026o3hn5hxdebwc	\N	2026-06-10 06:20:50.905
cmq7oku1r006vnlrer6ypl0dd	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-092 · Increase ad for MCA and promote MCA among RGU RSmart CSE Courses	/cbo/verticals/MKT	cmpryrktn0035o3hnf705olzi	\N	2026-06-10 06:21:36.927
cmq7oln8k006ynlre8xl0647c	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-091 · Increase admission for lateral entry	/cbo/verticals/MKT	cmpryqf1j002xo3hnuce4cxme	\N	2026-06-10 06:22:14.757
cmq7omiw60071nlreqvxr7gnc	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-089 · Sports quota can be given for MBA IEV	/cbo/verticals/MKT	cmpryo5fv002eo3hnxrep0wy8	\N	2026-06-10 06:22:55.782
cmq7onoes0074nlretxhhvm99	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-087 · Ad initiation for Counselling Psychology and PGDM	/cbo/verticals/MKT	cmprymbb3001yo3hn22w5etc7	\N	2026-06-10 06:23:49.588
cmq7oo7zk0077nlre8s3j6ifv	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-086 · Pure B.Com with Integrated CA training (Target 200 seats)	/cbo/verticals/MKT	cmprykt7x001qo3hn8p7h4nww	\N	2026-06-10 06:24:14.961
cmq7opadi007anlrefrow316e	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-085 · Full seat concession for accountancy	/cbo/verticals/MKT	cmpryjcoj001io3hn8v7n13dn	\N	2026-06-10 06:25:04.71
cmq7opwln007dnlresu0fgm1x	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Fashion Design, Media & Performing Arts	FDMPA-001 · CDF HoD-Coat for lady faculties	/cbo/verticals/FDMPA	cmpdkpnfm00405tvm42qk2ry6	\N	2026-06-10 06:25:33.515
cmq7oqe8j007gnlrepr84fpze	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-033 · Skill Passport Launch	/cbo/verticals/RGU	cmol0zhra004xlltvdsx00o5o	\N	2026-06-10 06:25:56.371
cmq7ordjj007jnlretcsv2oni	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-083 · Post Admission Process to be reviewed	/cbo/verticals/MKT	cmprxwnx20012o3hnb5m39hy7	\N	2026-06-10 06:26:42.127
cmq7osfh4007mnlrelmcq2829	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-076 · Campaign for Bharathiyar Universtiy Data	/cbo/verticals/MKT	cmphuxagz000apua17ulbl6vy	\N	2026-06-10 06:27:31.288
cmq7ot0nb007pnlre080n6cyj	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-066 · Increase digital spent in SAlem,Pollachi areas	/cbo/verticals/MKT	cmoqp77wq000u5tvm2k2xey51	\N	2026-06-10 06:27:58.727
cmq7ouxmp007snlreq3lnbxfu	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-068 · Common ad budget can be reduced and location specific ads can be increased	/cbo/verticals/MKT	cmoqpaore00165tvmaw2fu975	\N	2026-06-10 06:29:28.129
cmq7ovofb007vnlrewoola0rc	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-064 · Fix a KPI for chat	/cbo/verticals/MKT	cmoqp5ps0000i5tvmjw33bt46	\N	2026-06-10 06:30:02.856
cmq7ow7ik007ynlreb2p6mzoe	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-065 · Chatbot for Viscom,Fahion & MBA	/cbo/verticals/MKT	cmoqp6xce000o5tvmkebvt656	\N	2026-06-10 06:30:27.597
cmq7oy2mv0081nlreibmon2jv	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-059 · Fashion related Influencers can be planned	/cbo/verticals/MKT	cmol098n3001nlltvlhm9wq3q	\N	2026-06-10 06:31:54.584
cmq7ozka20084nlre084arbjs	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-058 · Viscom Ad run for Madurai & Palakkad	/cbo/verticals/MKT	cmol08vuj001hlltvfoy03mnn	\N	2026-06-10 06:33:04.107
cmq7p01yr0087nlreo6ikbbo0	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-054 · What is Viscom & Fashion	/cbo/verticals/MKT	cmol07esr000tlltvqyfe4tg3	\N	2026-06-10 06:33:27.027
cmq7p0isn008anlrezm8lrvmf	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-071 · May 15 admission offers can be planned	/cbo/verticals/MKT	cmoqpg5mh001o5tvmzzkrw3on	\N	2026-06-10 06:33:48.839
cmq7p8zwu0095nlre2q3oos5t	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in RAALE - Learning Ecosystem	RAALE-004 · Peer Learning Student Community	/sm/tasks/cmq7p8zwk0092nlrervog00t8	cmq7p8zwk0092nlrervog00t8	2026-06-11 05:03:00.884	2026-06-10 06:40:24.27
cmq7p8zwq0093nlre484z4kys	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in RAALE - Learning Ecosystem	RAALE-004 · Peer Learning Student Community	/cbo/verticals/RAALE	cmq7p8zwk0092nlrervog00t8	2026-06-11 06:16:26.759	2026-06-10 06:40:24.267
cmq7p9vcz009anlre5d9p7iok	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-047 · Student undertaking documentation	/cbo/verticals/MKT	cmokzm8k6000l54jtfzogvob3	2026-06-11 06:16:26.759	2026-06-10 06:41:05.027
cmq7pvgf700b2nlre2igzkkos	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-049 · Faculty video	/cbo/verticals/RGU	cmol1cpxh007qlltva536ro2m	2026-06-11 05:41:53.728	2026-06-10 06:57:52.1
cmq7pauwr009fnlrel786g23u	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-073 · Increase whatsapp campaign for Viscom,CDF,Commerce	/cbo/verticals/MKT	cmoqph70000205tvm939y1q0b	2026-06-11 06:16:26.759	2026-06-10 06:41:51.099
cmq7pc8dc009knlrezcln4mno	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-048 · Discussion with Corporate Gurukul	/cbo/verticals/MKT	cmokznkc3000r54jt1xfx3gn3	2026-06-11 06:16:26.759	2026-06-10 06:42:55.2
cmq7pd6qj009nnlreczcx6eb6	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-049 · Recruitment of coders through RSmart for Product engineers	/cbo/verticals/MKT	cmokzuevx001954jtdct4b9ot	2026-06-11 06:16:26.759	2026-06-10 06:43:39.739
cmq7phzpb009tnlre93gh0t5k	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-067 · RTC UG & RCAS UG can be concentrated for Tiruppur	/cbo/verticals/MKT	cmoqp9yyn00105tvmst9mr9ub	2026-06-11 06:16:26.759	2026-06-10 06:47:23.904
cmq7pkitx009ynlreuc74e2b3	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-063 · Printed Diary for Academician	/cbo/verticals/RGU	cmpfcose3007szj6sqfa9w92a	2026-06-11 06:16:26.759	2026-06-10 06:49:22.006
cmq7plb4m00a1nlrezqb409uu	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-064 · Printed Diary for Corporate	/cbo/verticals/RGU	cmpfcwkzl0083zj6syid80ji3	2026-06-11 06:16:26.759	2026-06-10 06:49:58.678
cmq7plf7t00a2nlre5bqg1den	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Creative	RGU-064 · Printed Diary for Corporate	/cbo/verticals/CRT	cmpfcwkzl0083zj6syid80ji3	2026-06-11 06:16:26.759	2026-06-10 06:50:03.977
cmq7pltud00a5nlre1ar9iyil	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-013 · Hardcopy Invitation for Guests	/cbo/verticals/RGU	cmok2wc9o002xp2zxrnrr0w23	2026-06-11 06:16:26.759	2026-06-10 06:50:22.934
cmq7pmf5f00a8nlre8bhc4c48	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-035 · RGU Coffee Table Book	/cbo/verticals/RGU	cmol10dij005blltv0kazatah	2026-06-11 06:16:26.759	2026-06-10 06:50:50.547
cmq7pmp7300abnlre19tordjk	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-027 · Name Badge	/cbo/verticals/RGU	cmol0tbtd003klltvlqk9t6ab	2026-06-11 06:16:26.759	2026-06-10 06:51:03.567
cmq7pnczx00aenlrefn5s0vth	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-026 · Thank You Card	/cbo/verticals/RGU	cmol0sawt003elltvjks06c8c	2026-06-11 06:16:26.759	2026-06-10 06:51:34.414
cmq7pnnzz00ahnlrephbazbpm	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-055 · Corporate Logo Banners – PHotos	/cbo/verticals/RGU	cmpfafdfh001kzj6siu3h74vj	2026-06-11 06:16:26.759	2026-06-10 06:51:48.672
cmq7pnzry00aknlre4rbj2id5	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-037 · May 15 Invitation	/cbo/verticals/RGU	cmol118h5005nlltvbyzbaqbm	2026-06-11 06:16:26.759	2026-06-10 06:52:03.934
cmq7pomw100annlret52pjwf4	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-036 · RGU Brochure	/cbo/verticals/RGU	cmol10tub005hlltv7axlxwze	2026-06-11 06:16:26.759	2026-06-10 06:52:33.889
cmq7pp4i200aqnlrefbc82rw1	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-025 · Legacy Wall Unveiled	/cbo/verticals/RGU	cmol0rkf80038lltvh9l0izwv	2026-06-11 06:16:26.759	2026-06-10 06:52:56.715
cmq7qxit900cinlre9dqu1c6g	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in Placements	PLC-011 · NCR Students Placements	/sm/tasks/cmq7qxisr00cfnlrefryyuvrz	cmq7qxisr00cfnlrefryyuvrz	2026-06-11 05:03:00.884	2026-06-10 07:27:28.125
cmq7qzk8u00cqnlrerffgidba	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in Marketing	MKT-102 · Increase RGU website traffic	/sm/tasks/cmq7qzk8g00cnnlre3k6ebp4h	cmq7qzk8g00cnnlre3k6ebp4h	2026-06-11 05:03:00.884	2026-06-10 07:29:03.295
cmq7r0rd200cynlredfbtwjov	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in RGU	RGU-067 · RGU website content for each School	/sm/tasks/cmq7r0rcr00cvnlreilqqodwa	cmq7r0rcr00cvnlreilqqodwa	2026-06-11 05:03:00.884	2026-06-10 07:29:59.174
cmq7r4xr500dbnlrewsjdgqo9	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in Research	RSH-001 · Research Board Meeting	/sm/tasks/cmq7r4xqq00d8nlreltdhfpeh	cmq7r4xqq00d8nlreltdhfpeh	2026-06-11 05:03:00.884	2026-06-10 07:33:14.081
cmq7r6ibo00djnlrehl57kkcr	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in RGU	RGU-068 · BBA Aviation Arivupattarai Plan	/sm/tasks/cmq7r6ib900dgnlreli5ui3zw	cmq7r6ib900dgnlreli5ui3zw	2026-06-11 05:03:00.884	2026-06-10 07:34:27.396
cmq7r82ru00dunlref7cx8v9m	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in Registrar	REG-002 · JD Dashboard	/sm/tasks/cmq7r82rl00drnlreykayyylu	cmq7r82rl00drnlreykayyylu	2026-06-11 05:03:00.884	2026-06-10 07:35:40.554
cmq7ppqfx00atnlrej6ruhyba	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-034 · The Pride Summit Brochure	/cbo/verticals/RGU	cmol100un0055lltvr783b2hg	2026-06-11 05:41:53.728	2026-06-10 06:53:25.15
cmq7pq72800awnlreivetzmyn	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-031 · Student Manifesto Campaign	/cbo/verticals/RGU	cmol0xq5f004jlltvn0f6ah0l	2026-06-11 05:41:53.728	2026-06-10 06:53:46.688
cmq7pr5rl00aznlrez7nmz3yc	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-030 · Gratitude Wall Founding Faculty	/cbo/verticals/RGU	cmol0wjbw004blltvgwksns1y	2026-06-11 05:41:53.728	2026-06-10 06:54:31.666
cmq7pvmlr00b5nlre46p8jfu3	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-049 · Faculty video	/cbo/verticals/RGU	cmol1cpxh007qlltva536ro2m	2026-06-11 05:41:53.728	2026-06-10 06:58:00.112
cmq7pwf5m00b8nlreyu6tu3fp	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-048 · Square badge	/cbo/verticals/RGU	cmol1c9fj007klltv9uci9ey6	2026-06-11 05:41:53.728	2026-06-10 06:58:37.114
cmq7pxk4p00bbnlrei2km7a54	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-014 · Kit for IT employees	/cbo/verticals/RGU	cmok2zxyw0030p2zx8woiygko	2026-06-11 05:41:53.728	2026-06-10 06:59:30.217
cmq7pybbz00bgnlreks8s70k4	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-024 · Faculty T-Shirts	/cbo/verticals/RGU	cmol0ozaa002slltvl985mqwz	2026-06-11 05:41:53.728	2026-06-10 07:00:05.471
cmq7pysae00bjnlrea20jl8x2	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-047 · Name badge	/cbo/verticals/RGU	cmol1btgh007elltvridj5ut5	2026-06-11 05:41:53.728	2026-06-10 07:00:27.446
cmq7pz6us00bmnlrexjht0w7r	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-028 · Department Pride Boards	/cbo/verticals/RGU	cmol0ur96003vlltvwgpsga8u	2026-06-11 05:41:53.728	2026-06-10 07:00:46.325
cmq7pznti00bpnlretys45rco	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-021 · Achievement Flags	/cbo/verticals/RGU	cmol0lvg60024lltvu09l47i0	2026-06-11 05:41:53.728	2026-06-10 07:01:08.311
cmq7q0wsk00bunlre9z7jqxba	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-020 · Temporary Entrance Arch	/cbo/verticals/RGU	cmol0kdf3001wlltvu4o07lfs	2026-06-11 05:41:53.728	2026-06-10 07:02:06.596
cmq7q1ekt00bxnlrelm9v2gte	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-044 · Visiting card	/cbo/verticals/RGU	cmol1av3m006wlltvnfz82z5d	2026-06-11 05:41:53.728	2026-06-10 07:02:29.646
cmq7q1txh00c0nlrex43oup80	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-043 · Thank you card	/cbo/verticals/RGU	cmol1afkx006qlltvfobd3p8u	2026-06-11 05:41:53.728	2026-06-10 07:02:49.542
cmq7q2k0000c3nlresq29apl5	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-029 · Founding Faculty Certificate	/cbo/verticals/RGU	cmol0vbzl0043lltvf64fhdzs	2026-06-11 05:41:53.728	2026-06-10 07:03:23.329
cmq7qxit400cgnlrercwiuy6b	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in Placements	PLC-011 · NCR Students Placements	/cbo/verticals/PLC	cmq7qxisr00cfnlrefryyuvrz	2026-06-11 05:41:53.728	2026-06-10 07:27:28.121
cmq7qzk8r00conlre1029b5js	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in Marketing	MKT-102 · Increase RGU website traffic	/cbo/verticals/MKT	cmq7qzk8g00cnnlre3k6ebp4h	2026-06-11 05:41:53.728	2026-06-10 07:29:03.292
cmq7r0rcz00cwnlremint8mam	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in RGU	RGU-067 · RGU website content for each School	/cbo/verticals/RGU	cmq7r0rcr00cvnlreilqqodwa	2026-06-11 05:41:53.728	2026-06-10 07:29:59.171
cmq7r4xr100d9nlre9kzirdxp	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in Research	RSH-001 · Research Board Meeting	/cbo/verticals/RSH	cmq7r4xqq00d8nlreltdhfpeh	2026-06-11 05:41:53.728	2026-06-10 07:33:14.077
cmq7r6ibk00dhnlreq8zhj7lv	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in RGU	RGU-068 · BBA Aviation Arivupattarai Plan	/cbo/verticals/RGU	cmq7r6ib900dgnlreli5ui3zw	2026-06-11 05:41:53.728	2026-06-10 07:34:27.392
cmq7r6rng00donlrelin8buw6	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-068 · BBA Aviation Arivupattarai Plan	/cbo/verticals/RGU	cmq7r6ib900dgnlreli5ui3zw	2026-06-11 05:41:53.728	2026-06-10 07:34:39.485
cmq7q2xi000c6nlreoo5h8yt0	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-015 · Faculty Handbook Distribution	/cbo/verticals/RGU	cmok35hwo0033p2zxobzj12at	2026-06-11 05:41:53.728	2026-06-10 07:03:40.824
cmq7q3brn00c9nlre8wv5qfu2	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in RGU	RGU-040 · Founding faculty certificate	/cbo/verticals/RGU	cmol15ejs0065lltv9xgpay3p	2026-06-11 05:41:53.728	2026-06-10 07:03:59.315
cmq7q521f00ccnlrelihjepyd	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Special Strategic Projects	SSP-001 · MBA Brochure	/cbo/verticals/SSP	cmpv3cc1p0002zsl63cvbi0he	2026-06-11 05:41:53.728	2026-06-10 07:05:20.019
cmq7r82rr00dsnlreq0adqnjy	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in Registrar	REG-002 · JD Dashboard	/cbo/verticals/REG	cmq7r82rl00drnlreykayyylu	2026-06-11 05:41:53.728	2026-06-10 07:35:40.552
cmq7p15hy008dnlres9961mf3	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-055 · AI chatbot for Viscom leads	/cbo/verticals/MKT	cmol07stu000zlltv5nmnrjwv	2026-06-11 06:16:26.759	2026-06-10 06:34:18.263
cmq7p2xbi008hnlrexnboobpn	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-057 · Webinar for photography and fashion	/cbo/verticals/MKT	cmol08emp001blltv3bod4x30	2026-06-11 06:16:26.759	2026-06-10 06:35:40.975
cmq7p3l1i008knlrebnexfe1o	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-061 · Career Path in Fashion	/cbo/verticals/MKT	cmol467yz008elltvjj75mv3k	2026-06-11 06:16:26.759	2026-06-10 06:36:11.719
cmq7p47st008nnlreapiu03ev	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Status → COMPLETED	MKT-051 · Malayalam Video for Viscom	/cbo/verticals/MKT	cmol04e340008lltvpm473qod	2026-06-11 06:16:26.759	2026-06-10 06:36:41.213
cmq7p53u7008qnlre73li0r06	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-061 · Career Path in Fashion	/cbo/verticals/MKT	cmol467yz008elltvjj75mv3k	2026-06-11 06:16:26.759	2026-06-10 06:37:22.735
cmq7p5v4d008tnlrerz5yuuf0	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-069 · Approval can be taken for consultants service charge for Physio and Pharmacy	/cbo/verticals/MKT	cmoqpf4g4001c5tvmfc4k88iv	2026-06-11 06:16:26.759	2026-06-10 06:37:58.093
cmq7p7fot008wnlrec08cmg0m	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-053 · Alumni portfolio-5 videos (Viscom & Fashion)	/cbo/verticals/MKT	cmol06rf2000nlltv4xh76si4	2026-06-11 06:16:26.759	2026-06-10 06:39:11.406
cmq7p803t008znlres0a9sev3	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.updated	Task updated in Marketing	MKT-070 · For RGU consultant admission test is mandatory	/cbo/verticals/MKT	cmoqpfls7001i5tvmcgy4wbk5	2026-06-11 06:16:26.759	2026-06-10 06:39:37.865
cmqafcnkm00eenlreclcifrr1	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-103 · Eachanari Bus stop Branding - Jimry	/cbo/verticals/MKT	cmqafcnk800ednlre4fggtb9s	\N	2026-06-12 04:26:37.271
cmqafcnkr00egnlrevwvby9g5	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in Marketing	MKT-103 · Eachanari Bus stop Branding - Jimry	/sm/tasks/cmqafcnk800ednlre4fggtb9s	cmqafcnk800ednlre4fggtb9s	\N	2026-06-12 04:26:37.275
cmqaved8r00emnlre5trr66nc	cmoj2rexy002vxk851qncfoc2	cmoj2reur002txk85m6ya4byh	task.created	New task in Marketing	MKT-104 · Student Undertaking-RGU,RTC,Pharmacy,Physio	/cbo/verticals/MKT	cmqaved8h00elnlres4mjfnpd	\N	2026-06-12 11:55:51.052
cmqaved8w00eonlreunrvytty	cmoj2reur002txk85m6ya4byh	cmoj2reur002txk85m6ya4byh	task.created	New task in Marketing	MKT-104 · Student Undertaking-RGU,RTC,Pharmacy,Physio	/sm/tasks/cmqaved8h00elnlres4mjfnpd	cmqaved8h00elnlres4mjfnpd	\N	2026-06-12 11:55:51.057
cmqettjb600eunlrep9lw7pqu	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-069 · School of Computing Day wise attendance percentage - Manikandan	/cbo/verticals/RGU	cmqettjab00etnlre4xhpzr0l	\N	2026-06-15 06:22:44.227
cmqettjba00ewnlrecpoa7cjb	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-069 · School of Computing Day wise attendance percentage - Manikandan	/sm/tasks/cmqettjab00etnlre4xhpzr0l	cmqettjab00etnlre4xhpzr0l	\N	2026-06-15 06:22:44.23
cmqetu6ol00f2nlre3nd2g8ml	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-070 · School of Computing Assessment feedback to be collected from students - Manikandan	/cbo/verticals/RGU	cmqetu6oe00f1nlreqxo683hw	\N	2026-06-15 06:23:14.518
cmqetu6op00f4nlre6752o176	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-070 · School of Computing Assessment feedback to be collected from students - Manikandan	/sm/tasks/cmqetu6oe00f1nlreqxo683hw	cmqetu6oe00f1nlreqxo683hw	\N	2026-06-15 06:23:14.521
cmqetvdr800fanlre5p4nq78i	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-071 · School of Computing 281 students to be plaed before July is the target -  Manikandan	/cbo/verticals/RGU	cmqetvdr200f9nlrevvvlbmy4	\N	2026-06-15 06:24:10.341
cmqetvdrb00fcnlreo5wtikf5	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-071 · School of Computing 281 students to be plaed before July is the target -  Manikandan	/sm/tasks/cmqetvdr200f9nlrevvvlbmy4	cmqetvdr200f9nlrevvvlbmy4	\N	2026-06-15 06:24:10.343
cmqetvyed00finlrexx8u0evd	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-072 · School of Computing OLT Training feedback to be collected (other than food feedback) - Manikandan	/cbo/verticals/RGU	cmqetvye800fhnlreilr6h75j	\N	2026-06-15 06:24:37.093
cmqetvyef00fknlresmmlmrfo	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-072 · School of Computing OLT Training feedback to be collected (other than food feedback) - Manikandan	/sm/tasks/cmqetvye800fhnlreilr6h75j	cmqetvye800fhnlreilr6h75j	\N	2026-06-15 06:24:37.096
cmqeu2uud00fqnlrempbxtm0r	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-073 · School of computing Feed back on the MAT classes and Linkedin Learning - Manikandan	/cbo/verticals/RGU	cmqeu2utz00fpnlre2kcnxfsj	\N	2026-06-15 06:29:59.077
cmqeu2uuk00fsnlre9rhcxlpk	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-073 · School of computing Feed back on the MAT classes and Linkedin Learning - Manikandan	/sm/tasks/cmqeu2utz00fpnlre2kcnxfsj	cmqeu2utz00fpnlre2kcnxfsj	\N	2026-06-15 06:29:59.084
cmqeu4gla00fynlreeyrr0382	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-074 · School of Commerce Fortnight bond can be collected and implemented for all schools -	/cbo/verticals/RGU	cmqeu4gl000fxnlrebbgbvsau	\N	2026-06-15 06:31:13.918
cmqeu4glc00g0nlrek44lg9w7	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-074 · School of Commerce Fortnight bond can be collected and implemented for all schools -	/sm/tasks/cmqeu4gl000fxnlrebbgbvsau	cmqeu4gl000fxnlrebbgbvsau	\N	2026-06-15 06:31:13.921
cmqeu5gcx00g6nlreannr24iq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-075 · School of Commerce Assessment feedback to be collected from the students	/cbo/verticals/RGU	cmqeu5gct00g5nlre0t4k9fns	\N	2026-06-15 06:32:00.273
cmqeu5gd000g8nlre84xrxy7y	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-075 · School of Commerce Assessment feedback to be collected from the students	/sm/tasks/cmqeu5gct00g5nlre0t4k9fns	cmqeu5gct00g5nlre0t4k9fns	\N	2026-06-15 06:32:00.277
cmqeu96tq00gmnlreyh73yu28	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-077 · School of Commerce CAT plan	/cbo/verticals/RGU	cmqeu96tl00glnlrejclj6v5x	\N	2026-06-15 06:34:54.543
cmqeu96tt00gonlre110nyb3h	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-077 · School of Commerce CAT plan	/sm/tasks/cmqeu96tl00glnlrejclj6v5x	cmqeu96tl00glnlrejclj6v5x	\N	2026-06-15 06:34:54.545
cmqeu7eke00genlrec5bgllq7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-076 · School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated.	/cbo/verticals/RGU	cmqeu7ek900gdnlreq4rh8gcq	\N	2026-06-15 06:33:31.262
cmqeu7ekg00ggnlrezb9xd3ep	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-076 · School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated.	/sm/tasks/cmqeu7ek900gdnlreq4rh8gcq	cmqeu7ek900gdnlreq4rh8gcq	\N	2026-06-15 06:33:31.265
cmqeu9olb00gunlrepj7o6p8b	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-078 · School of commerce Assessment plan need to be monitored and can be made common for all levels.	/cbo/verticals/RGU	cmqeu9ol000gtnlre4g3q89uz	\N	2026-06-15 06:35:17.567
cmqeu9olf00gwnlretr3aojqx	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-078 · School of commerce Assessment plan need to be monitored and can be made common for all levels.	/sm/tasks/cmqeu9ol000gtnlre4g3q89uz	cmqeu9ol000gtnlre4g3q89uz	\N	2026-06-15 06:35:17.572
cmqeub0oj00h2nlre77q1xbcw	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-079 · School of commerce Assessment process need to be finalized	/cbo/verticals/RGU	cmqeub0o900h1nlrewaiidrf2	\N	2026-06-15 06:36:19.891
cmqeub0om00h4nlrek7nub7e3	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-079 · School of commerce Assessment process need to be finalized	/sm/tasks/cmqeub0o900h1nlrewaiidrf2	cmqeub0o900h1nlrewaiidrf2	\N	2026-06-15 06:36:19.894
cmqeubm6300hanlrebb04zlbx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-080 · School of commerce Assessment outcome need to be finalized	/cbo/verticals/RGU	cmqeubm5y00h9nlre35vay5fk	\N	2026-06-15 06:36:47.739
cmqeubm6600hcnlre7nscb3c4	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-080 · School of commerce Assessment outcome need to be finalized	/sm/tasks/cmqeubm5y00h9nlre35vay5fk	cmqeubm5y00h9nlre35vay5fk	\N	2026-06-15 06:36:47.742
cmqeuccv100hinlredppdsep8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-081 · School of business 115 offer letters need to be collected and documented by the Placement office	/cbo/verticals/RGU	cmqeuccux00hhnlre1z3cnhvd	\N	2026-06-15 06:37:22.334
cmqeuccv400hknlreweit4ct0	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-081 · School of business 115 offer letters need to be collected and documented by the Placement office	/sm/tasks/cmqeuccux00hhnlre1z3cnhvd	cmqeuccux00hhnlre1z3cnhvd	\N	2026-06-15 06:37:22.336
cmqeudcjh00hqnlreicojie8p	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-082 · School of Viscom All attendance and outcome need to be monitored	/cbo/verticals/RGU	cmqeudcjc00hpnlrevdk2mdm5	\N	2026-06-15 06:38:08.573
cmqeudcjk00hsnlre3p4ox0lf	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-082 · School of Viscom All attendance and outcome need to be monitored	/sm/tasks/cmqeudcjc00hpnlrevdk2mdm5	cmqeudcjc00hpnlrevdk2mdm5	\N	2026-06-15 06:38:08.576
cmqeuedll00hynlrebods9fc2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-083 · School of viscom Feedback need to be collected for all events - sathish	/cbo/verticals/RGU	cmqeuedlg00hxnlreojqkaxpm	\N	2026-06-15 06:38:56.602
cmqeuedlo00i0nlre04fxqubi	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-083 · School of viscom Feedback need to be collected for all events - sathish	/sm/tasks/cmqeuedlg00hxnlreojqkaxpm	cmqeuedlg00hxnlreojqkaxpm	\N	2026-06-15 06:38:56.604
cmqeuet1500i6nlren88k75fk	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-084 · CDF Plan for demo day and the outcome plan to be monitored	/cbo/verticals/RGU	cmqeuet0y00i5nlre93jnn1bp	\N	2026-06-15 06:39:16.602
cmqeuet1d00i8nlrevdppes6h	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-084 · CDF Plan for demo day and the outcome plan to be monitored	/sm/tasks/cmqeuet0y00i5nlre93jnn1bp	cmqeuet0y00i5nlre93jnn1bp	\N	2026-06-15 06:39:16.61
cmqevh61800idnlrenbiitsel	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-069 · Day-wise attendance percentage needs to be monitored and reviewed regularly - Dr.Manikandan	/cbo/verticals/RGU	cmqettjab00etnlre4xhpzr0l	\N	2026-06-15 07:09:06.38
cmqevhvqh00ignlre7xeby7gx	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-070 · Assessment feedback to be collected from students and analyzed for improvement - Dr.Manikandan	/cbo/verticals/RGU	cmqetu6oe00f1nlreqxo683hw	\N	2026-06-15 07:09:39.689
cmqevinbq00ijnlrelv86kt37	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-071 · Target to place 281 students before July to be tracked and achieved -  Dr.MAnikandan	/cbo/verticals/RGU	cmqetvdr200f9nlrevvvlbmy4	\N	2026-06-15 07:10:15.446
cmqevjjqr00imnlreefxexzj7	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-072 · OLT Training feedback to be collected (excluding food-related feedback) - Dr.Manikandan	/cbo/verticals/RGU	cmqetvye800fhnlreilr6h75j	\N	2026-06-15 07:10:57.46
cmqevkzw800ipnlrej2g85vro	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-073 · Feedback to be collected on MAT classes and LinkedIn Learning initiatives - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeu2utz00fpnlre2kcnxfsj	\N	2026-06-15 07:12:05.049
cmqevlijt00isnlrezgg3yxnp	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-072 · OLT Training feedback to be collected (excluding food-related feedback) - Dr.Raje (CAT Team)	/cbo/verticals/RGU	cmqetvye800fhnlreilr6h75j	\N	2026-06-15 07:12:29.225
cmqevm8sa00ivnlreadgq1rki	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-070 · Assessment feedback to be collected from students and analyzed for improvement - Dr.Krishnaraj	/cbo/verticals/RGU	cmqetu6oe00f1nlreqxo683hw	\N	2026-06-15 07:13:03.227
cmqevxd6l00iynlrewbutlkze	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-074 · School of Commerce Fortnight bond can be collected and implemented for all schools - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeu4gl000fxnlrebbgbvsau	\N	2026-06-15 07:21:42.141
cmqevxw4t00j1nlre2qjo86d6	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-075 · School of Commerce Assessment feedback to be collected from the students - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeu5gct00g5nlre0t4k9fns	\N	2026-06-15 07:22:06.701
cmqevyhyp00j4nlre412z7b8a	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-076 · School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated - Dr.Hema,Dr.Krishnaraj	/cbo/verticals/RGU	cmqeu7ek900gdnlreq4rh8gcq	\N	2026-06-15 07:22:34.993
cmqevzqlx00j7nlren8hc2spe	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-077 · Yellow card system to be implemented for attendance violations - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeu96tl00glnlrejclj6v5x	\N	2026-06-15 07:23:32.853
cmqew0u1100janlre33v2atwq	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-078 · CAT plan needs to be prepared and monitored - Dr.Raje (CAT Team)	/cbo/verticals/RGU	cmqeu9ol000gtnlre4g3q89uz	\N	2026-06-15 07:24:23.941
cmqew2b2q00jgnlre35lf4pk2	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-080 · Assessment process and evaluation framework need to be finalized - Dr.Raje (CAT Team)	/cbo/verticals/RGU	cmqeubm5y00h9nlre35vay5fk	\N	2026-06-15 07:25:32.69
cmqew2vhi00jjnlreck5n8rnc	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-081 · Assessment outcomes and expected deliverables need to be finalized - Dr.Raje (CAT Team)	/cbo/verticals/RGU	cmqeuccux00hhnlre1z3cnhvd	\N	2026-06-15 07:25:59.143
cmqew1hti00jdnlref50nnll4	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-079 · Assessment plan to be standardized and implemented commonly across all levels - Dr.Raje (CAT Team)	/cbo/verticals/RGU	cmqeub0o900h1nlrewaiidrf2	\N	2026-06-15 07:24:54.774
cmqew3dzn00jmnlrewc7woyp0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-082 · 115 offer letters need to be collected and properly documented by the Placement Office - Siva sir	/cbo/verticals/RGU	cmqeudcjc00hpnlrevdk2mdm5	\N	2026-06-15 07:26:23.124
cmqew594300jpnlre12xz02bh	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-083 · School of Media & Performing Arts - Attendance and learning outcomes need to be monitored regularly - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeuedlg00hxnlreojqkaxpm	\N	2026-06-15 07:27:50.116
cmqew63qh00jsnlre1w3uylc8	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.updated	Task updated in RGU	RGU-084 · School of Media & Performing Arts - Feedback to be collected for all events conducted - Dr.Krishnaraj	/cbo/verticals/RGU	cmqeuet0y00i5nlre93jnn1bp	\N	2026-06-15 07:28:29.801
cmqew6yh100jwnlrekyys6c7k	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-085 · School of Fashion Design - Plan for Demo Day and monitor the expected outcomes - Dr.Aruna	/cbo/verticals/RGU	cmqew6ygu00jvnlreygahi8mh	\N	2026-06-15 07:29:09.638
cmqew6yh400jynlrey2hnyr3j	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-085 · School of Fashion Design - Plan for Demo Day and monitor the expected outcomes - Dr.Aruna	/sm/tasks/cmqew6ygu00jvnlreygahi8mh	cmqew6ygu00jvnlreygahi8mh	\N	2026-06-15 07:29:09.64
cmqew7kyc00k4nlrea4vp4ase	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-086 · School of Fashion Design - Communication training program needs to be planned - Dr.Krishnaraj	/cbo/verticals/RGU	cmqew7ky500k3nlrevchhiec1	\N	2026-06-15 07:29:38.773
cmqew7kye00k6nlrenkjvs13e	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-086 · School of Fashion Design - Communication training program needs to be planned - Dr.Krishnaraj	/sm/tasks/cmqew7ky500k3nlrevchhiec1	cmqew7ky500k3nlrevchhiec1	\N	2026-06-15 07:29:38.775
cmqew8dbq00kcnlre98yssft0	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-087 · School of Fashion Design - Student feedback to be collected regularly - Dr.Krishnaraj	/cbo/verticals/RGU	cmqew8dbm00kbnlredop4kuo1	\N	2026-06-15 07:30:15.543
cmqew8dbt00kenlrel56cwzt5	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-087 · School of Fashion Design - Student feedback to be collected regularly - Dr.Krishnaraj	/sm/tasks/cmqew8dbm00kbnlredop4kuo1	cmqew8dbm00kbnlredop4kuo1	\N	2026-06-15 07:30:15.545
cmqew91da00kknlre5zt55q9i	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-088 · School of Fashion Design - Uniform plan to be finalized - Dr.Aruna,Dr.Krishnaraj	/cbo/verticals/RGU	cmqew91d600kjnlre6ljn7wu3	\N	2026-06-15 07:30:46.703
cmqew91dd00kmnlreyxur0yzx	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-088 · School of Fashion Design - Uniform plan to be finalized - Dr.Aruna,Dr.Krishnaraj	/sm/tasks/cmqew91d600kjnlre6ljn7wu3	cmqew91d600kjnlre6ljn7wu3	\N	2026-06-15 07:30:46.705
cmqewcxpr00ksnlre0sbfh972	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-089 · School of Fashion Design - Demo Day calendar, concepts, and expected outcomes to be finalized - Department Team	/cbo/verticals/RGU	cmqewcxpe00krnlrejzjny51u	\N	2026-06-15 07:33:48.591
cmqewcxpv00kunlre8rms7ff0	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-089 · School of Fashion Design - Demo Day calendar, concepts, and expected outcomes to be finalized - Department Team	/sm/tasks/cmqewcxpe00krnlrejzjny51u	cmqewcxpe00krnlrejzjny51u	\N	2026-06-15 07:33:48.596
cmqewdrtp00l0nlreyg133j37	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-090 · School of Fashion Design - Classes to be started for the 19 enrolled students with small deliverables and home assignments - Dr.Aruna	/cbo/verticals/RGU	cmqewdrtf00kznlrexpwfvkb8	\N	2026-06-15 07:34:27.613
cmqewdrts00l2nlrezp36kg1v	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-090 · School of Fashion Design - Classes to be started for the 19 enrolled students with small deliverables and home assignments - Dr.Aruna	/sm/tasks/cmqewdrtf00kznlrexpwfvkb8	cmqewdrtf00kznlrexpwfvkb8	\N	2026-06-15 07:34:27.616
cmqeweieu00l8nlre3ec482zc	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-091 · School of Fashion Design - Budget requirement for learning activities to be discussed and finalized - Dr.Aruna ,Dr.Krishnaraj	/cbo/verticals/RGU	cmqeweiep00l7nlre2sk5d371	\N	2026-06-15 07:35:02.07
cmqeweiex00lanlrelzo202tl	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-091 · School of Fashion Design - Budget requirement for learning activities to be discussed and finalized - Dr.Aruna ,Dr.Krishnaraj	/sm/tasks/cmqeweiep00l7nlre2sk5d371	cmqeweiep00l7nlre2sk5d371	\N	2026-06-15 07:35:02.073
cmqewf6aw00lgnlreuha59p60	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-092 · School of Psychology - UG First Year uniform plan to be prepared - Dr.Seetha	/cbo/verticals/RGU	cmqewf6as00lfnlre03ljgkmo	\N	2026-06-15 07:35:33.033
cmqewf6az00linlrecqmdtmjz	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-092 · School of Psychology - UG First Year uniform plan to be prepared - Dr.Seetha	/sm/tasks/cmqewf6as00lfnlre03ljgkmo	cmqewf6as00lfnlre03ljgkmo	\N	2026-06-15 07:35:33.036
cmqewfx8c00lonlrea1hct54g	cmoj2rexy002vxk851qncfoc2	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-093 · School of Psychology - Two days of casual dress plan can be considered for students - Dr.Seetha	/cbo/verticals/RGU	cmqewfx8700lnnlrez220usct	\N	2026-06-15 07:36:07.932
cmqewfx8j00lqnlrek07ottq6	cmoj2rf13002xxk85dachrvmn	cmoj2rf13002xxk85dachrvmn	task.created	New task in RGU	RGU-093 · School of Psychology - Two days of casual dress plan can be considered for students - Dr.Seetha	/sm/tasks/cmqewfx8700lnnlrez220usct	cmqewfx8700lnnlrez220usct	\N	2026-06-15 07:36:07.94
\.


--
-- Data for Name: OwnerRole; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."OwnerRole" (id, name, description, active, "createdAt", "ownerEmail", "ownerName") FROM stdin;
cmoj2rejg0000xk85c5u73l07	Marketing Head	\N	t	2026-04-28 20:24:41.308	\N	\N
cmoj2rejq0001xk85ldeu4uzh	Digital Marketing Lead	\N	t	2026-04-28 20:24:41.319	\N	\N
cmoj2reju0002xk855t6ani9d	Telecalling Head	\N	t	2026-04-28 20:24:41.322	\N	\N
cmoj2rekg0004xk85nt0ejoxw	Counselling Head	\N	t	2026-04-28 20:24:41.328	\N	\N
cmoj2rekm0005xk85xggr9k4h	Course Coordinator	\N	t	2026-04-28 20:24:41.35	\N	\N
cmoj2rekp0006xk85gb0k37fh	Branding Team	\N	t	2026-04-28 20:24:41.353	\N	\N
cmoj2reks0007xk85meshx517	Content Team	\N	t	2026-04-28 20:24:41.356	\N	\N
cmoj2rekv0008xk85au7zhlcu	CRM Team	\N	t	2026-04-28 20:24:41.36	\N	\N
cmoj2rekz0009xk85ahoq1eb8	Accounts	\N	t	2026-04-28 20:24:41.363	\N	\N
cmoj2rel1000axk85favjg5po	School Team	\N	t	2026-04-28 20:24:41.366	\N	\N
cmoj2rel7000cxk853lqi3z10	Alumni Coordinator	\N	t	2026-04-28 20:24:41.372	\N	\N
cmoj2relb000dxk85hrp0w8ew	Influencer Coordinator	\N	t	2026-04-28 20:24:41.375	\N	\N
cmoj2rele000exk85cnzahhbw	Website Team	\N	t	2026-04-28 20:24:41.378	\N	\N
cmoj2relh000fxk85mq19wizh	Social Media Lead	\N	t	2026-04-28 20:24:41.381	\N	\N
cmoj2rell000gxk859tkogzrk	RTC Head	\N	t	2026-04-28 20:24:41.386	\N	\N
cmoj2relo000hxk85wb6qirbf	RTC Coordinator	\N	t	2026-04-28 20:24:41.388	\N	\N
cmoj2relr000ixk85kn3hysxs	Academic Team	\N	t	2026-04-28 20:24:41.392	\N	\N
cmoj2relx000kxk85gyr6w8bh	CoE Team	\N	t	2026-04-28 20:24:41.398	\N	\N
cmoj2rem0000lxk85zqb70g7r	Research Team	\N	t	2026-04-28 20:24:41.4	\N	\N
cmoj2rem3000mxk8510mbhfxk	Ranking Team	\N	t	2026-04-28 20:24:41.404	\N	\N
cmoj2rem6000nxk85q35keory	RFabX Lead	\N	t	2026-04-28 20:24:41.407	\N	\N
cmoj2rem9000oxk85i9jkdaor	Placement Head	\N	t	2026-04-28 20:24:41.409	\N	\N
cmoj2remc000pxk8521yejp9u	Training Head	\N	t	2026-04-28 20:24:41.412	\N	\N
cmoj2remf000qxk85378cc2mo	Placement Strategy Team	\N	t	2026-04-28 20:24:41.415	\N	\N
cmoj2reml000sxk85ey2klh5g	AIC Team	\N	t	2026-04-28 20:24:41.421	\N	\N
cmoj2remo000txk85sap1xuam	Event Lead	\N	t	2026-04-28 20:24:41.424	\N	\N
cmoj2remr000uxk85z25w3yls	RGU Core Team	\N	t	2026-04-28 20:24:41.427	\N	\N
cmoj2remu000vxk85yuggo8sm	RGU Lead	\N	t	2026-04-28 20:24:41.43	\N	\N
cmoj2remx000wxk85w6hm0dp2	Academic Head	\N	t	2026-04-28 20:24:41.433	\N	\N
cmoj2remz000xxk851e6l7vit	HR	\N	t	2026-04-28 20:24:41.436	\N	\N
cmoj2ren2000yxk85nm65jskt	Senior Manager	\N	t	2026-04-28 20:24:41.439	\N	\N
cmoj2relu000jxk85u14s3336	Student Affairs	\N	t	2026-04-28 20:24:41.395	jimryhenry@rathinam.in	Mr. Jimry Hendry
cmoj2ren5000zxk85h56yuj2n	Dr. BN	\N	t	2026-04-28 20:24:41.442	cbo@rathinam.in	D. B Nagaraj
cmoj2rel4000bxk85g8otk168	Consultant Coordinator	\N	t	2026-04-28 20:24:41.369	\N	\N
cmoj2rejx0003xk85byy6yh6g	Admission Manager	\N	t	2026-04-28 20:24:41.325	pandielavarasan@rathinam.in	Mr. Pandi Elavarasan
cmpkuzvfo0000113wydfe7xak	Team Leader	\N	t	2026-05-25 07:02:34.212	\N	udhayaprakash.rtc@rathinam.in
cmps0mij40000heomw8mvsun3	RAALE	\N	t	2026-05-30 07:14:31.888	rarunkumar@rathinam.in	Dr. R. Arunkumar
cmpust3j2002op8dt40hcvutg	Registrar	\N	t	2026-06-01 05:59:00.639	registrar@rathinam.in	Dr. Krishnaraj
cmoj2remi000rxk85875wfzaz	Pradeepraj	\N	t	2026-04-28 20:24:41.418	pradeepraj@aicraise.com	Mr. Pradeepraj
cmq7ndj28002jnlregrv2smp4	Dr.Krishnaraj	Registrar	t	2026-06-10 05:47:56.481	\N	\N
cmq7nfaw6002knlreo214j336	Dr.Raje	Dean-CAT	t	2026-06-10 05:49:19.206	\N	\N
cmq7nim27002lnlre2crctjbi	Dr.Arun Kumar	RAALE & CoE 	t	2026-06-10 05:51:53.648	\N	\N
cmq7niwjj002mnlreu3l0t5tp	Meghala	Digital Marketing Manager	t	2026-06-10 05:52:07.231	\N	\N
cmq7njicv002nnlrejd4j6jq9	Pandi Elavarasan	Physical Marketing Manager	t	2026-06-10 05:52:35.504	\N	\N
cmq7njx9v002onlre9ygj3dfe	Dr.Hema	Commerce Dean	t	2026-06-10 05:52:54.836	\N	\N
cmq7nk9dx002pnlreqvbn20u8	Sathishanandan	Dean Events	t	2026-06-10 05:53:10.533	\N	\N
cmq7nkgq4002qnlresibaam2n	Raju	Viscom Dean	t	2026-06-10 05:53:20.045	\N	\N
cmq7nkqpx002rnlrej7fjy77x	Dr.Geetha	RTC Principal	t	2026-06-10 05:53:32.997	\N	\N
cmq7ntatd003snlre4m1hjjtw	Arunraaj Manickaraj	RSTNAT,RGUSAT,MBA	t	2026-06-10 06:00:12.289	\N	\N
cmq7nukyb003tnlreoronk4xt	Ramesh	RTC,RSTNAT Admission Manager	t	2026-06-10 06:01:12.084	\N	\N
cmq7offsd006anlre1tzmc5k1	Dr.Sivasubramaniam	Placement Director	t	2026-06-10 06:17:25.165	\N	\N
cmq7p21qb008enlrehdxysiwb	Aruna	FAshion Design Associate Dean	t	2026-06-10 06:35:00.036	\N	\N
cmq7ph6ao009qnlrelql5uzyw	Udhaykumar	Creative	t	2026-06-10 06:46:45.793	\N	\N
cmq7r2f1p00d1nlrep4edud52	Sabareesh	Research Board	t	2026-06-10 07:31:16.526	\N	\N
\.


--
-- Data for Name: ParkingLot; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."ParkingLot" (id, idea, "suggestedBy", "verticalId", "expectedImpact", urgency, decision, "reviewDate", remarks, "capturedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: Pin; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Pin" (id, "userId", kind, "refId", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: Priority; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Priority" (id, code, label, description, "reviewCadence", "colorHex", rank, active) FROM stdin;
cmoj2reqm002oxk85v8rq58a6	P1	Critical	Must be reviewed by Dr. BN	Daily tracking	#ef4444	1	t
cmoj2reqq002pxk85srkt5qsy	P2	Important	Team can execute with direction	Twice-a-week review	#f59e0b	2	t
cmoj2reqs002qxk85b5tuberg	P3	Operational	Senior Manager tracks	Weekly review	#0ea5e9	3	t
cmoj2reqv002rxk858ar8lb0w	P4	Parked	Future idea, not immediate execution	Monthly review only	#6b7280	4	t
\.


--
-- Data for Name: SubVertical; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."SubVertical" (id, name, description, "verticalId", "sortOrder", active, "createdAt") FROM stdin;
cmoj2reoq0017xk853xusa0cs	Physical Marketing	\N	cmoj2rena0010xk85cuzrw5fp	0	t	2026-04-28 20:24:41.495
cmoj2reoz0019xk85wrsnjpt9	Digital Marketing	\N	cmoj2rena0010xk85cuzrw5fp	1	t	2026-04-28 20:24:41.507
cmoj2rep1001bxk85bqn8p02r	Lead Dashboards	\N	cmoj2rena0010xk85cuzrw5fp	2	t	2026-04-28 20:24:41.51
cmoj2rep4001dxk85lqmfhwup	Budget Review	\N	cmoj2rena0010xk85cuzrw5fp	3	t	2026-04-28 20:24:41.512
cmoj2rep7001fxk85u4l2qk80	Course Strategy	\N	cmoj2rena0010xk85cuzrw5fp	4	t	2026-04-28 20:24:41.516
cmoj2repa001hxk85gh5oqsf0	RAALE	\N	cmoj2renh0011xk85ij9xbfhe	5	t	2026-04-28 20:24:41.518
cmoj2repc001jxk85c397qiau	Growth Card	\N	cmoj2renh0011xk85ij9xbfhe	6	t	2026-04-28 20:24:41.52
cmoj2repe001lxk856lsk394c	Campus Life	\N	cmoj2renh0011xk85ij9xbfhe	7	t	2026-04-28 20:24:41.522
cmoj2repg001nxk85cy0jzoeu	CoE Hub	\N	cmoj2renh0011xk85ij9xbfhe	8	t	2026-04-28 20:24:41.524
cmoj2repi001pxk8509h2exli	Research & Ranking	\N	cmoj2renh0011xk85ij9xbfhe	9	t	2026-04-28 20:24:41.526
cmoj2repk001rxk85ra31dn56	RTC Operations	\N	cmoj2renh0011xk85ij9xbfhe	10	t	2026-04-28 20:24:41.529
cmoj2repm001txk85n5iiu3dl	KPI Monitoring	\N	cmoj2renl0012xk85vwlmtkom	11	t	2026-04-28 20:24:41.531
cmoj2repq001vxk85ohnud2il	Quality Placement	\N	cmoj2renl0012xk85vwlmtkom	12	t	2026-04-28 20:24:41.534
cmoj2reps001xxk85dv2hhb48	Training Effectiveness	\N	cmoj2renl0012xk85vwlmtkom	13	t	2026-04-28 20:24:41.536
cmoj2repu001zxk85lx7tbhyp	Team Operations	\N	cmoj2renl0012xk85vwlmtkom	14	t	2026-04-28 20:24:41.538
cmoj2repw0021xk8562082kd5	Revenue Model	\N	cmoj2renn0013xk857ix3cstf	15	t	2026-04-28 20:24:41.541
cmoj2repy0023xk85bwne7n70	Incubation Events	\N	cmoj2renn0013xk857ix3cstf	16	t	2026-04-28 20:24:41.543
cmoj2req10025xk85gyrd5dg1	Investment & Schemes	\N	cmoj2renn0013xk857ix3cstf	17	t	2026-04-28 20:24:41.545
cmoj2req20027xk855yia190x	Venture Studio	\N	cmoj2renn0013xk857ix3cstf	18	t	2026-04-28 20:24:41.547
cmoj2req50029xk85fupm22ow	Prelaunch	\N	cmoj2renr0014xk8560p00ufi	19	t	2026-04-28 20:24:41.549
cmoj2req7002bxk85n4v6gtmb	Launch	\N	cmoj2renr0014xk8560p00ufi	20	t	2026-04-28 20:24:41.551
cmoj2req8002dxk85f7r0bzvv	Team Setup	\N	cmoj2renr0014xk8560p00ufi	21	t	2026-04-28 20:24:41.553
cmoj2reqa002fxk85uq4ylvo5	Change Management	\N	cmoj2renr0014xk8560p00ufi	22	t	2026-04-28 20:24:41.555
cmoj2reqd002hxk852vqpi4bf	Academic Setup	\N	cmoj2renr0014xk8560p00ufi	23	t	2026-04-28 20:24:41.557
cmoj2reqf002jxk8574pjse39	Boss Instructions	\N	cmoj2rent0015xk85js8spr5y	24	t	2026-04-28 20:24:41.559
cmoj2reqh002lxk85qm9y751q	Management Agenda	\N	cmoj2rent0015xk85js8spr5y	25	t	2026-04-28 20:24:41.561
cmoj2reqj002nxk85vfzgsduv	New Initiatives	\N	cmoj2rent0015xk85js8spr5y	26	t	2026-04-28 20:24:41.563
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Task" (id, code, title, description, "verticalId", "subVerticalId", "priorityId", status, source, "ownerUserId", "ownerRoleId", "createdById", deadline, frequency, "supportNeeded", "delayReason", "nextAction", intervention, "expectedOutput", "lastUpdateAt", "droppedAt", "createdAt", "updatedAt", "dropReason", "slaBreachedAt", "slaDueAt", "sourceInstructionId", "sourceParkingId", "subOwnerId") FROM stdin;
cmok2pfww002rp2zxup9y0jie	RGU-011	Airport copy -2 designs	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	DEPARTMENT_MEETING	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-04-29 13:10:55.952	\N	2026-04-29 13:10:55.953	2026-04-29 13:10:55.953	\N	\N	\N	\N	\N	\N
cmol0zhra004xlltvdsx00o5o	RGU-033	Skill Passport Launch	\N	cmoj2renr0014xk8560p00ufi	cmoj2req50029xk85fupm22ow	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:25:56.362	\N	2026-04-30 05:10:31.847	2026-06-10 06:25:56.363	\N	\N	\N	\N	\N	\N
cmol0kdf3001wlltvu4o07lfs	RGU-020	Temporary Entrance Arch	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:02:06.586	\N	2026-04-30 04:58:46.383	2026-06-10 07:02:06.588	\N	\N	\N	\N	\N	\N
cmok35hwo0033p2zxobzj12at	RGU-015	Faculty Handbook Distribution	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	BOSS_INSTRUCTION	\N	cmoj2ren2000yxk85nm65jskt	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:03:40.785	\N	2026-04-29 13:23:25.032	2026-06-10 07:03:40.787	\N	\N	\N	\N	\N	\N
cmq7p8zwk0092nlrervog00t8	RAALE-004	Peer Learning Student Community	\N	cmps0oof80003heomf5urdcuh	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	DEPARTMENT_MEETING	\N	cmq7nfaw6002knlreo214j336	cmoj2reur002txk85m6ya4byh	2026-06-17 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:40:24.259	\N	2026-06-10 06:40:24.26	2026-06-10 06:40:24.26	\N	\N	\N	\N	\N	\N
cmokzm8k6000l54jtfzogvob3	MKT-047	Student undertaking documentation	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-05-02 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:41:05.01	\N	2026-04-30 04:32:13.782	2026-06-10 06:41:05.013	\N	\N	\N	\N	\N	\N
cmol0q5d60030lltvu45rxwgm	MKT-060	Visiting Cards with Envelopes / Box	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-04-30 05:03:19.285	\N	2026-04-30 05:03:15.883	2026-04-30 05:03:19.286	\N	\N	\N	\N	\N	\N
cmokznkc3000r54jt1xfx3gn3	MKT-048	Discussion with Corporate Gurukul	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	PARKED	SELF_STRATEGY	\N	cmq7ntatd003snlre4m1hjjtw	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:42:55.165	\N	2026-04-30 04:33:15.7	2026-06-10 06:42:55.169	\N	\N	\N	\N	\N	\N
cmol10dij005blltv0kazatah	RGU-035	RGU Coffee Table Book	\N	cmoj2renr0014xk8560p00ufi	cmoj2req50029xk85fupm22ow	cmoj2reqq002pxk85srkt5qsy	PARKED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:50:50.538	\N	2026-04-30 05:11:13.003	2026-06-10 06:50:50.539	\N	\N	\N	\N	\N	\N
cmol118h5005nlltvbyzbaqbm	RGU-037	May 15 Invitation	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:52:03.925	\N	2026-04-30 05:11:53.129	2026-06-10 06:52:03.927	\N	\N	\N	\N	\N	\N
cmol10tub005hlltv7axlxwze	RGU-036	RGU Brochure	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	WAITING_FOR_APPROVAL	SELF_STRATEGY	\N	cmq7ph6ao009qnlrelql5uzyw	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:52:33.878	\N	2026-04-30 05:11:34.163	2026-06-10 06:52:33.881	\N	\N	\N	\N	\N	\N
cmol100un0055lltvr783b2hg	RGU-034	The Pride Summit Brochure	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:53:25.109	\N	2026-04-30 05:10:56.591	2026-06-10 06:53:25.134	\N	\N	\N	\N	\N	\N
cmol4k5xn008rlltv2ohqwnw3	MKT-062	Video script content for B.Com	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-04-30 00:00:00	\N	\N	\N	\N	NO	\N	2026-04-30 06:52:36.811	\N	2026-04-30 06:50:35.147	2026-04-30 06:52:36.812	\N	\N	\N	\N	\N	\N
cmol0ozaa002slltvl985mqwz	RGU-024	Faculty T-Shirts	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:00:05.461	\N	2026-04-30 05:02:21.346	2026-06-10 07:00:05.463	\N	\N	\N	\N	\N	\N
cmoj2rf2p003dxk85l9efx3vn	MKT-008	Flex and hoardings campaign	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	DROPPED	SELF_STRATEGY	\N	cmoj2rekp0006xk85gb0k37fh	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42	2026-04-29 12:56:46.969	2026-04-28 20:24:42.001	2026-04-29 12:56:46.97	\N	\N	\N	\N	\N	\N
cmoj2rf1e002zxk85a6knzd80	MKT-001	Weekly MRM and action-taken points review	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	Action points closed weekly	2026-04-28 20:24:41.946	2026-04-29 13:02:03.985	2026-04-28 20:24:41.954	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmol0lvg60024lltvu09l47i0	RGU-021	Achievement Flags	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:01:08.301	\N	2026-04-30 04:59:56.406	2026-06-10 07:01:08.303	\N	\N	\N	\N	\N	\N
cmqetvye800fhnlreilr6h75j	RGU-072	OLT Training feedback to be collected (excluding food-related feedback) - Dr.Raje (CAT Team)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:12:29.217	\N	2026-06-15 06:24:37.089	2026-06-15 07:12:29.218	\N	\N	\N	\N	\N	\N
cmqeu5gct00g5nlre0t4k9fns	RGU-075	School of Commerce Assessment feedback to be collected from the students - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:22:06.689	\N	2026-06-15 06:32:00.269	2026-06-15 07:22:06.69	\N	\N	\N	\N	\N	\N
cmol4kulc008xlltv54vb97a6	MKT-063	Webinar for Commerce hot,warm & col leads	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	PARKED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-05 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:12:53.853	\N	2026-04-30 06:51:07.104	2026-06-10 06:12:53.854	\N	\N	\N	\N	\N	\N
cmol13mem005tlltvw9p6cjar	RGU-038	Teaser video	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 04:22:51	\N	2026-04-30 05:13:44.494	2026-05-21 04:22:51.001	\N	\N	\N	\N	\N	\N
cmoqp77wq000u5tvm2k2xey51	MKT-066	Increase digital spent in SAlem,Pollachi areas	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:27:58.719	\N	2026-05-04 04:27:13.994	2026-06-10 06:27:58.72	\N	\N	\N	\N	\N	\N
cmoqpaore00165tvmaw2fu975	MKT-068	Common ad budget can be reduced and location specific ads can be increased	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:29:28.121	\N	2026-05-04 04:29:55.803	2026-06-10 06:29:28.122	\N	\N	\N	\N	\N	\N
cmoqp5ps0000i5tvmjw33bt46	MKT-064	Fix a KPI for chat	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:30:02.844	\N	2026-05-04 04:26:03.84	2026-06-10 06:30:02.847	\N	\N	\N	\N	\N	\N
cmoqp6xce000o5tvmkebvt656	MKT-065	Chatbot for Viscom,Fahion & MBA	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:30:27.585	\N	2026-05-04 04:27:00.302	2026-06-10 06:30:27.586	\N	\N	\N	\N	\N	\N
cmpfa4y3z000qzj6sjx7ty4bu	REG-001	Corporate & Academic Council Create a On Boarding poster	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	PARKED	SELF_STRATEGY	\N	cmq7ntatd003snlre4m1hjjtw	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:07:18.131	\N	2026-05-21 09:19:48.143	2026-06-10 06:07:18.132	\N	\N	\N	\N	\N	\N
cmpf9tmbj000azj6sg179zznl	RGU-051	Krishnakumar-Controller of Examination -RGU marksheet	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:10:59.646	\N	2026-05-21 09:10:59.647	2026-05-21 09:10:59.647	\N	\N	\N	\N	\N	\N
cmpf9jmvi0002zj6s9wk6za3r	RGU-050	Times Now Promotion Plan-Viscom Sathish	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:08:15.383	\N	2026-05-21 09:03:13.806	2026-06-10 06:08:15.383	\N	\N	\N	\N	\N	\N
cmokzwsjv001f54jt5w5et3uh	RGU-019	Online Presentation for Google AI CoE	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqm002oxk85v8rq58a6	PARKED	SELF_STRATEGY	\N	cmq7nim27002lnlre2crctjbi	cmoj2rf13002xxk85dachrvmn	2026-04-30 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:11:38.496	\N	2026-04-30 04:40:26.245	2026-06-10 06:11:38.499	\N	\N	\N	\N	\N	\N
cmokzshsf001354jtd0pmqgwl	RGU-018	Meeting for IT Server for RSmart classes with IT team	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-04-30 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:13:28.432	\N	2026-04-30 04:37:05.669	2026-06-10 06:13:28.433	\N	\N	\N	\N	\N	\N
cmok2s20r002up2zxw7td5pdy	RGU-012	Online meeting with HBS with MBA leader	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	DEPARTMENT_MEETING	\N	cmq7nfaw6002knlreo214j336	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:14:43.846	\N	2026-04-29 13:12:57.915	2026-06-10 06:14:43.872	\N	\N	\N	\N	\N	\N
cmokzuevx001954jtdct4b9ot	MKT-049	Recruitment of coders through RSmart for Product engineers	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqs002qxk85b5tuberg	NOT_STARTED	SELF_STRATEGY	\N	cmq7ndj28002jnlregrv2smp4	cmoj2rf13002xxk85dachrvmn	2026-05-05 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:43:39.725	\N	2026-04-30 04:38:35.226	2026-06-10 06:43:39.728	\N	\N	\N	\N	\N	\N
cmoqp9yyn00105tvmst9mr9ub	MKT-067	RTC UG & RCAS UG can be concentrated for Tiruppur	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:47:23.889	\N	2026-05-04 04:29:22.368	2026-06-10 06:47:23.89	\N	\N	\N	\N	\N	\N
cmol0tbtd003klltvlqk9t6ab	RGU-027	Name Badge	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:51:03.555	\N	2026-04-30 05:05:44.21	2026-06-10 06:51:03.557	\N	\N	\N	\N	\N	\N
cmol0sawt003elltvjks06c8c	RGU-026	Thank You Card	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:51:34.399	\N	2026-04-30 05:04:56.382	2026-06-10 06:51:34.406	\N	\N	\N	\N	\N	\N
cmoj2rf5d004lxk851n1731tw	MKT-030	Ad spend based on HE / ME / LE classification	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.096	2026-04-29 13:02:03.985	2026-04-28 20:24:42.097	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf5p004rxk85kocrovii	MKT-033	Social media dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2relh000fxk85mq19wizh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.108	2026-04-29 13:02:03.985	2026-04-28 20:24:42.109	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmpfafdfh001kzj6siu3h74vj	RGU-055	Corporate Logo Banners – PHotos	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:51:48.659	\N	2026-05-21 09:27:54.557	2026-06-10 06:51:48.661	\N	\N	\N	\N	\N	\N
cmol0rkf80038lltvh9l0izwv	RGU-025	Legacy Wall Unveiled	\N	cmoj2renr0014xk8560p00ufi	cmoj2req50029xk85fupm22ow	cmoj2reqq002pxk85srkt5qsy	DELAYED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:52:56.704	\N	2026-04-30 05:04:22.052	2026-06-10 06:52:56.705	\N	\N	\N	\N	\N	\N
cmol1av3m006wlltvnfz82z5d	RGU-044	Visiting card	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:02:29.636	\N	2026-04-30 05:19:22.354	2026-06-10 07:02:29.638	\N	\N	\N	\N	\N	\N
cmol1afkx006qlltvfobd3p8u	RGU-043	Thank you card	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:02:49.532	\N	2026-04-30 05:19:02.241	2026-06-10 07:02:49.535	\N	\N	\N	\N	\N	\N
cmol15ejs0065lltv9xgpay3p	RGU-040	Founding faculty certificate	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:03:59.301	\N	2026-04-30 05:15:07.625	2026-06-10 07:03:59.303	\N	\N	\N	\N	\N	\N
cmol162tr006blltve6vh3d4f	RGU-041	Skill Passport	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 04:20:39.027	\N	2026-04-30 05:15:39.088	2026-05-21 04:20:39.027	\N	\N	\N	\N	\N	\N
cmq7qxisr00cfnlrefryyuvrz	PLC-011	NCR Students Placements	\N	cmoj2renl0012xk85vwlmtkom	\N	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7offsd006anlre1tzmc5k1	cmoj2reur002txk85m6ya4byh	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:27:28.106	\N	2026-06-10 07:27:28.107	2026-06-10 07:27:28.107	\N	\N	\N	\N	\N	\N
cmokyz0lj00056gwx44561j9c	RGU-016	Guest finalisation	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	DEPARTMENT_MEETING	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 04:21:10.246	\N	2026-04-30 04:14:10.375	2026-05-21 04:21:10.247	\N	\N	\N	\N	\N	\N
cmokzkqep000f54jt9bba10eo	MKT-046	May 1 offer day	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	Completed	NO	\N	2026-05-21 04:21:42.439	\N	2026-04-30 04:31:03.602	2026-05-21 04:21:42.44	\N	\N	\N	\N	\N	\N
cmqew6ygu00jvnlreygahi8mh	RGU-085	School of Fashion Design - Plan for Demo Day and monitor the expected outcomes - Dr.Aruna	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:29:09.629	\N	2026-06-15 07:29:09.63	2026-06-15 07:29:09.63	\N	\N	\N	\N	\N	\N
cmol151n3005zlltvsrj80evq	RGU-039	Chairman Video	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 04:25:08.375	\N	2026-04-30 05:14:50.895	2026-05-21 04:25:08.376	\N	\N	\N	\N	\N	\N
cmpfaegdo0019zj6sn12qsnio	RGU-054	Distinguished Corporate – Photos	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:27:21.651	\N	2026-05-21 09:27:11.724	2026-05-21 09:27:21.652	\N	\N	\N	\N	\N	\N
cmpfaga3h001vzj6sdvytoluj	RGU-056	Global University Connection	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:28:47.365	\N	2026-05-21 09:28:36.894	2026-05-21 09:28:47.365	\N	\N	\N	\N	\N	\N
cmpfca04o005wzj6shjgigi7b	CRT-046	ID Card – 4 × 6 inch – DELEGATE	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:20:06.628	\N	2026-05-21 10:19:43.273	2026-05-21 10:20:06.629	\N	\N	\N	\N	\N	\N
cmpfcf0sj006tzj6seumx3m7g	CRT-049	Digital invitation	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:23:45.947	\N	2026-05-21 10:23:37.411	2026-05-21 10:23:45.948	\N	\N	\N	\N	\N	\N
cmol17wd3006klltvk73gxk83	RGU-042	Paper ad for RGU launch	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-01 05:23:54.259	\N	2026-04-30 05:17:04.023	2026-06-01 05:23:54.26	\N	\N	\N	\N	\N	\N
cmol0xq5f004jlltvn0f6ah0l	RGU-031	Student Manifesto Campaign	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:53:46.678	\N	2026-04-30 05:09:09.411	2026-06-10 06:53:46.68	\N	\N	\N	\N	\N	\N
cmol098n3001nlltvlhm9wq3q	MKT-059	Fashion related Influencers can be planned	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-05 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:31:54.536	\N	2026-04-30 04:50:06.976	2026-06-10 06:31:54.538	\N	\N	\N	\N	\N	\N
cmoj2rf38003lxk855f325tfs	MKT-012	HE / ME / LE course classification	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep7001fxk85u4l2qk80	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-06-10 06:15:40.671	\N	2026-04-28 20:24:42.02	2026-06-10 06:15:40.672	\N	\N	\N	\N	\N	\N
cmol08vuj001hlltvfoy03mnn	MKT-058	Viscom Ad run for Madurai & Palakkad	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:33:04.092	\N	2026-04-30 04:49:50.396	2026-06-10 06:33:04.093	\N	\N	\N	\N	\N	\N
cmokz3aos000f6gwxkkqpf8lv	MKT-043	RSTNAT exam portal discussion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-04-30 04:17:45.722	\N	2026-04-30 04:17:30.076	2026-04-30 04:17:45.723	\N	\N	\N	\N	\N	\N
cmol084zs0015lltv4zmr0xjs	MKT-056	Career Path in FAshion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-04-30 04:49:15.591	\N	2026-04-30 04:49:15.592	2026-04-30 04:49:15.592	\N	\N	\N	\N	\N	\N
cmq7r0rcr00cvnlreilqqodwa	RGU-067	RGU website content for each School	\N	cmoj2renr0014xk8560p00ufi	\N	cmoj2reqs002qxk85b5tuberg	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2reur002txk85m6ya4byh	2026-06-17 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 07:29:59.162	\N	2026-06-10 07:29:59.163	2026-06-10 07:29:59.163	\N	\N	\N	\N	\N	\N
cmol07esr000tlltvqyfe4tg3	MKT-054	What is Viscom & Fashion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-04 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:33:27.019	\N	2026-04-30 04:48:41.643	2026-06-10 06:33:27.02	\N	\N	\N	\N	\N	\N
cmol06fki000hlltv11tjdlse	MKT-052	Viscom Studio Infra Video	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-04-30 06:02:34.56	\N	2026-04-30 04:47:55.986	2026-04-30 06:02:34.561	\N	\N	\N	\N	\N	\N
cmol1cpxh007qlltva536ro2m	RGU-049	Faculty video	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:58:00.096	\N	2026-04-30 05:20:48.966	2026-06-10 06:58:00.098	\N	\N	\N	\N	\N	\N
cmoqpg5mh001o5tvmzzkrw3on	MKT-071	May 15 admission offers can be planned	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:33:48.831	\N	2026-05-04 04:34:10.937	2026-06-10 06:33:48.832	\N	\N	\N	\N	\N	\N
cmol07stu000zlltv5nmnrjwv	MKT-055	AI chatbot for Viscom leads	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-02 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:34:18.254	\N	2026-04-30 04:48:59.826	2026-06-10 06:34:18.255	\N	\N	\N	\N	\N	\N
cmoj2rf1q0031xk854hu553ra	MKT-002	Poor-performing course strategy (RTC, Viscom, Fashion, MBA, MCA, Physio, Pharmacy)	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:41.965	2026-04-29 13:02:03.985	2026-04-28 20:24:41.966	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoqpfls7001i5tvmcgy4wbk5	MKT-070	For RGU consultant admission test is mandatory	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:39:37.851	\N	2026-05-04 04:33:45.224	2026-06-10 06:39:37.853	\N	\N	\N	\N	\N	\N
cmol08emp001blltv3bod4x30	MKT-057	Webinar for photography and fashion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DELAYED	SELF_STRATEGY	\N	cmq7nk9dx002pnlreqvbn20u8	cmoj2rf13002xxk85dachrvmn	2026-05-06 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:35:40.961	\N	2026-04-30 04:49:28.081	2026-06-10 06:35:40.963	\N	\N	\N	\N	\N	\N
cmoqpf4g4001c5tvmfc4k88iv	MKT-069	Approval can be taken for consultants service charge for Physio and Pharmacy	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	DELAYED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:37:58.08	\N	2026-05-04 04:33:22.756	2026-06-10 06:37:58.081	\N	\N	\N	\N	\N	\N
cmol06rf2000nlltv4xh76si4	MKT-053	Alumni portfolio-5 videos (Viscom & Fashion)	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7nk9dx002pnlreqvbn20u8	cmoj2rf13002xxk85dachrvmn	2026-05-04 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:39:11.396	\N	2026-04-30 04:48:11.342	2026-06-10 06:39:11.399	\N	\N	\N	\N	\N	\N
cmoqph70000205tvm939y1q0b	MKT-073	Increase whatsapp campaign for Viscom,CDF,Commerce	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:41:51.09	\N	2026-05-04 04:34:59.377	2026-06-10 06:41:51.091	\N	\N	\N	\N	\N	\N
cmok2wc9o002xp2zxrnrr0w23	RGU-013	Hardcopy Invitation for Guests	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	BOSS_INSTRUCTION	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:50:22.924	\N	2026-04-29 13:16:17.82	2026-06-10 06:50:22.926	\N	\N	\N	\N	\N	\N
cmol0wjbw004blltvgwksns1y	RGU-030	Gratitude Wall Founding Faculty	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:54:31.648	\N	2026-04-30 05:08:13.916	2026-06-10 06:54:31.651	\N	\N	\N	\N	\N	\N
cmol1c9fj007klltv9uci9ey6	RGU-048	Square badge	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	cmq7ph6ao009qnlrelql5uzyw	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:58:37.072	\N	2026-04-30 05:20:27.584	2026-06-10 06:58:37.098	\N	\N	\N	\N	\N	\N
cmol1btgh007elltvridj5ut5	RGU-047	Name badge	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:00:27.434	\N	2026-04-30 05:20:06.881	2026-06-10 07:00:27.436	\N	\N	\N	\N	\N	\N
cmol0ur96003vlltvwgpsga8u	RGU-028	Department Pride Boards	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:00:46.315	\N	2026-04-30 05:06:50.874	2026-06-10 07:00:46.317	\N	\N	\N	\N	\N	\N
cmol0vbzl0043lltvf64fhdzs	RGU-029	Founding Faculty Certificate	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqs002qxk85b5tuberg	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:03:23.316	\N	2026-04-30 05:07:17.745	2026-06-10 07:03:23.318	\N	\N	\N	\N	\N	\N
cmol0y697004plltveig2mw0j	RGU-032	RGU Logo Launch	\N	cmoj2renr0014xk8560p00ufi	cmoj2req50029xk85fupm22ow	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 04:25:40.958	\N	2026-04-30 05:09:30.283	2026-05-21 04:25:40.959	\N	\N	\N	\N	\N	\N
cmq7qzk8g00cnnlre3k6ebp4h	MKT-102	Increase RGU website traffic	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	DIGITAL_REVIEW	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2reur002txk85m6ya4byh	\N	\N	\N	\N	\N	NO	\N	2026-06-10 07:29:03.28	\N	2026-06-10 07:29:03.281	2026-06-10 07:29:03.281	\N	\N	\N	\N	\N	\N
cmpfc71hy005jzj6scsls5rev	CRT-045	Scribbling Pad – Front Page – A5 size	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:17:53.397	\N	2026-05-21 10:17:25.078	2026-05-21 10:17:53.398	\N	\N	\N	\N	\N	\N
cmpfcaugd0067zj6sqe5iq5qh	CRT-047	Lanyard – 30 × 0.75 inch	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:20:36.807	\N	2026-05-21 10:20:22.573	2026-05-21 10:20:36.808	\N	\N	\N	\N	\N	\N
cmqeu7ek900gdnlreq4rh8gcq	RGU-076	School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated - Dr.Hema,Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:22:34.982	\N	2026-06-15 06:33:31.257	2026-06-15 07:22:34.983	\N	\N	\N	\N	\N	\N
cmqew7ky500k3nlrevchhiec1	RGU-086	School of Fashion Design - Communication training program needs to be planned - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:29:38.764	\N	2026-06-15 07:29:38.765	2026-06-15 07:29:38.765	\N	\N	\N	\N	\N	\N
cmpfceg3g006izj6s2sgk43p6	CRT-048	Paper Ad	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:08:04.125	\N	2026-05-21 10:23:10.589	2026-05-25 05:08:04.127	\N	\N	\N	\N	\N	\N
cmoj2rf1v0033xk856s2jr7jo	MKT-003	Lead generation tracking	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:41.97	2026-04-29 13:02:03.985	2026-04-28 20:24:41.971	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf220035xk85ao72mwp7	MKT-004	Lead nurturing for walk-ins	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rekg0004xk85nt0ejoxw	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:41.977	2026-04-29 13:02:03.985	2026-04-28 20:24:41.978	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf2b0037xk85k2xod7pv	MKT-005	Warm-to-hot conversion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2reju0002xk855t6ani9d	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:41.986	2026-04-29 13:02:03.985	2026-04-28 20:24:41.987	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf2f0039xk85z51lr3qo	MKT-006	Walk-in to admission conversion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:41.99	2026-04-29 13:02:03.985	2026-04-28 20:24:41.991	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf2k003bxk857gajcoce	MKT-007	Telecaller monitoring	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2reju0002xk855t6ani9d	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:41.995	2026-04-29 13:02:03.985	2026-04-28 20:24:41.996	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf2t003fxk85zqlwg3pa	MKT-009	Newspaper and inserts	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqs002qxk85b5tuberg	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Campaign-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.005	2026-04-29 13:02:03.985	2026-04-28 20:24:42.005	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf2y003hxk85sjzz4zqn	MKT-010	Expos coordination	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Event-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.009	2026-04-29 13:02:03.985	2026-04-28 20:24:42.01	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf33003jxk85nv7d9keq	MKT-011	Budget spent review	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep4001dxk85lqmfhwup	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rekz0009xk85ahoq1eb8	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.014	2026-04-29 13:02:03.985	2026-04-28 20:24:42.015	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3d003nxk85xeihqzcd	MKT-013	New strategy formulation with Dr. BN	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep7001fxk85u4l2qk80	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2ren2000yxk85nm65jskt	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.024	2026-04-29 13:02:03.985	2026-04-28 20:24:42.025	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3h003pxk859rl0ut4u	MKT-014	Brochures and content creation	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2reks0007xk85meshx517	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.028	2026-04-29 13:02:03.985	2026-04-28 20:24:42.029	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3l003rxk85chlzwofl	MKT-015	Raw data campaigning	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2reju0002xk855t6ani9d	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.032	2026-04-29 13:02:03.985	2026-04-28 20:24:42.033	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3p003txk858p0zzwkz	MKT-016	AI calls operations	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rekv0008xk85au7zhlcu	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.036	2026-04-29 13:02:03.985	2026-04-28 20:24:42.037	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3t003vxk85zqtt56nd	MKT-017	AI chat operations	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.04	2026-04-29 13:02:03.985	2026-04-28 20:24:42.041	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf3x003xxk856ji2hsir	MKT-018	Webinars by department	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.044	2026-04-29 13:02:03.985	2026-04-28 20:24:42.045	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf41003zxk8529pe158d	MKT-019	School admissions review	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rel1000axk85favjg5po	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.048	2026-04-29 13:02:03.985	2026-04-28 20:24:42.049	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf460041xk855me2p549	MKT-020	Walk-in dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep1001bxk85bqn8p02r	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.053	2026-04-29 13:02:03.985	2026-04-28 20:24:42.054	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4a0043xk854put8f0a	MKT-021	Consultant dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep1001bxk85bqn8p02r	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rel4000bxk85g8otk168	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.057	2026-04-29 13:02:03.985	2026-04-28 20:24:42.058	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4e0045xk85ytihkscc	MKT-022	Overall leads dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep1001bxk85bqn8p02r	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rekv0008xk85au7zhlcu	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.062	2026-04-29 13:02:03.985	2026-04-28 20:24:42.062	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4j0047xk85r5mkphdo	MKT-023	Student deliverables documentation	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2relr000ixk85kn3hysxs	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.066	2026-04-29 13:02:03.985	2026-04-28 20:24:42.067	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4n0049xk8505zv1fy0	MKT-024	Student Experience Centre feedback	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2relu000jxk85u14s3336	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.07	2026-04-29 13:02:03.985	2026-04-28 20:24:42.071	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4r004bxk85gte0d4hn	MKT-025	USP document for each course	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2rep7001fxk85u4l2qk80	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2reks0007xk85meshx517	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.074	2026-04-29 13:02:03.985	2026-04-28 20:24:42.075	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf4v004dxk85eirl2wq3	MKT-026	GIP request form processing	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.078	2026-04-29 13:02:03.985	2026-04-28 20:24:42.079	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf50004fxk85ev9ju272	MKT-027	Alumni Is Our Pride distribution	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rel7000cxk853lqi3z10	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.083	2026-04-29 13:02:03.985	2026-04-28 20:24:42.084	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf54004hxk85f3eevkbx	MKT-028	WhatsApp campaign	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	Daily	\N	\N	\N	NO	\N	2026-04-28 20:24:42.087	2026-04-29 13:02:03.985	2026-04-28 20:24:42.088	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf59004jxk85oxjmb7bo	MKT-029	Department-wise lead nurturing plan	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.092	2026-04-29 13:02:03.985	2026-04-28 20:24:42.093	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf5t004txk85yrue2130	MKT-034	Website traffic dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rele000exk85cnzahhbw	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.112	2026-04-29 13:02:03.985	2026-04-28 20:24:42.113	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf66004zxk85cxq07n7z	MKT-037	New strategies adopted and impact report	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.126	2026-04-29 13:02:03.985	2026-04-28 20:24:42.127	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6a0051xk85qvoaw48d	MKT-038	RCAS Rsmart non-CS strategy impact	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.13	2026-04-29 13:02:03.985	2026-04-28 20:24:42.13	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6e0053xk85dezf0riu	MKT-039	School admissions digital strategy impact	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rel1000axk85favjg5po	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.134	2026-04-29 13:02:03.985	2026-04-28 20:24:42.134	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6r0059xk85mzvr5tej	MKT-042	Retargeting ad dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.147	2026-04-29 13:02:03.985	2026-04-28 20:24:42.148	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6w005bxk85g9hcrkmc	RTC-001	Department-wise RAALE implementation review	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repa001hxk85gh5oqsf0	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.151	2026-04-29 13:02:03.985	2026-04-28 20:24:42.152	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf78005hxk85t4gxqg1i	RTC-004	Engagement activities calendar	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repe001lxk856lsk394c	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2relu000jxk85u14s3336	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.163	2026-04-29 13:02:03.985	2026-04-28 20:24:42.164	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7c005jxk851ktrk6he	RTC-005	Wow factor — certifications and appreciation model	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.167	2026-04-29 13:02:03.985	2026-04-28 20:24:42.168	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7r005pxk85s2nvj1bj	RTC-008	Faculty / team recruitment	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remz000xxk851e6l7vit	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	YES	\N	2026-04-28 20:24:42.182	2026-04-29 13:02:03.985	2026-04-28 20:24:42.183	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7v005rxk853uaqxdxw	RTC-009	Research proposal and publication progress	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repi001pxk8509h2exli	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rem0000lxk85zqb70g7r	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.186	2026-04-29 13:02:03.985	2026-04-28 20:24:42.187	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf8j005xxk85ntclqmzr	RTC-012	RFabX revenue report	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rem6000nxk85q35keory	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.21	2026-04-29 13:02:03.985	2026-04-28 20:24:42.211	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf8n005zxk8503mihl5b	RTC-013	NASA program progress	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2relo000hxk85wb6qirbf	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.214	2026-04-29 13:02:03.985	2026-04-28 20:24:42.215	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf930067xk85kohi4jd8	PLC-002	Team-wise KPI report	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repm001txk85n5iiu3dl	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rem9000oxk85i9jkdaor	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.23	2026-04-29 13:02:03.985	2026-04-28 20:24:42.231	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf970069xk85d4pycyw9	PLC-003	Monthly placement calendar (visits + training)	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repq001vxk85ohnud2il	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rem9000oxk85i9jkdaor	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.235	2026-04-29 13:02:03.985	2026-04-28 20:24:42.235	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9j006fxk85claw34n2	PLC-006	Commitment letter tracking	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repq001vxk85ohnud2il	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rem9000oxk85i9jkdaor	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.247	2026-04-29 13:02:03.985	2026-04-28 20:24:42.247	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9n006hxk85ozjsb0m8	PLC-007	Placement team recruitment	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repu001zxk85lx7tbhyp	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remz000xxk851e6l7vit	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	YES	\N	2026-04-28 20:24:42.25	2026-04-29 13:02:03.985	2026-04-28 20:24:42.251	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfa0006nxk85dyiqkooo	AIC-002	Incubation event calendar	\N	cmoj2renn0013xk857ix3cstf	cmoj2repy0023xk85bwne7n70	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2reml000sxk85ey2klh5g	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.263	2026-04-29 13:02:03.985	2026-04-28 20:24:42.264	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfa4006pxk85309vyutn	AIC-003	Investor connect and tracking	\N	cmoj2renn0013xk857ix3cstf	cmoj2req10025xk85gyrd5dg1	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remi000rxk85875wfzaz	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.267	2026-04-29 13:02:03.985	2026-04-28 20:24:42.268	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfag006vxk85j3u1amd9	AIC-006	Venture Studio model	\N	cmoj2renn0013xk857ix3cstf	cmoj2req20027xk855yia190x	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remi000rxk85875wfzaz	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.279	2026-04-29 13:02:03.985	2026-04-28 20:24:42.28	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfat006xxk85zto6zx8w	AIC-007	Consolidated AIC RAISE dashboard	\N	cmoj2renn0013xk857ix3cstf	cmoj2repw0021xk8562082kd5	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2ren2000yxk85nm65jskt	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.293	2026-04-29 13:02:03.985	2026-04-28 20:24:42.294	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfb50073xk85bx8vq010	RGU-002	RGU launch plan	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remr000uxk85z25w3yls	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.305	2026-04-29 13:02:03.985	2026-04-28 20:24:42.305	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfb90075xk85u0uzxzuj	RGU-003	RGU team recruitment	\N	cmoj2renr0014xk8560p00ufi	cmoj2req8002dxk85f7r0bzvv	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remz000xxk851e6l7vit	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	YES	\N	2026-04-28 20:24:42.308	2026-04-29 13:02:03.985	2026-04-28 20:24:42.309	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfbd0077xk85okt6e4p6	RGU-004	Organisational setup planning	\N	cmoj2renr0014xk8560p00ufi	cmoj2req8002dxk85f7r0bzvv	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remu000vxk85yuggo8sm	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.312	2026-04-29 13:02:03.985	2026-04-28 20:24:42.313	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfbq007dxk85qyy9fw71	RGU-007	Individual school training plan	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remx000wxk85w6hm0dp2	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.324	2026-04-29 13:02:03.985	2026-04-28 20:24:42.326	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfbu007fxk85h0y4vwoz	RGU-008	Faculty handbooks (draft + final)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	DROPPED	BOSS_INSTRUCTION	\N	cmoj2relr000ixk85kn3hysxs	cmoj2rf13002xxk85dachrvmn	2026-05-08 00:00:00	Weekly	\N	\N	\N	ONLY_IF_DELAYED	Distribution to RGU faculties	2026-04-29 05:32:19.779	2026-04-29 13:02:03.985	2026-04-28 20:24:42.33	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf5h004nxk85w5gfjbzw	MKT-031	High and low performing ads review	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.1	2026-04-29 13:02:03.985	2026-04-28 20:24:42.101	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf5l004pxk85z2pmubqt	MKT-032	Lead nurturing plan	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rekv0008xk85au7zhlcu	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.104	2026-04-29 13:02:03.985	2026-04-28 20:24:42.105	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf5y004vxk85j13tskgn	MKT-035	Influencer dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2relb000dxk85hrp0w8ew	cmoj2rf13002xxk85dachrvmn	\N	Campaign-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.117	2026-04-29 13:02:03.985	2026-04-28 20:24:42.119	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf62004xxk85970hpin9	MKT-036	Google and Meta ad review (CPL, CTR, conversion)	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.122	2026-04-29 13:02:03.985	2026-04-28 20:24:42.122	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6i0055xk85dsf5jthm	MKT-040	RYH dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rejq0001xk85ldeu4uzh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.138	2026-04-29 13:02:03.985	2026-04-28 20:24:42.139	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf6m0057xk85a0911n93	MKT-041	Digital budget review	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rekz0009xk85ahoq1eb8	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.142	2026-04-29 13:02:03.985	2026-04-28 20:24:42.142	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf70005dxk85bx26ggqx	RTC-002	Student growth card implementation	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repc001jxk85c397qiau	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2relr000ixk85kn3hysxs	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.155	2026-04-29 13:02:03.985	2026-04-28 20:24:42.156	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf74005fxk85i21q9f93	RTC-003	RTC budget plan and utilization	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rekz0009xk85ahoq1eb8	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.159	2026-04-29 13:02:03.985	2026-04-28 20:24:42.16	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7g005lxk85flgmwwrb	RTC-006	CoE Hub immersion and progress	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repg001nxk85cy0jzoeu	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2relx000kxk85gyr6w8bh	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.171	2026-04-29 13:02:03.985	2026-04-28 20:24:42.172	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7m005nxk85h985pwih	RTC-007	AI coach learning model	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.175	2026-04-29 13:02:03.985	2026-04-28 20:24:42.178	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf7z005txk85fmvi11bd	RTC-010	Ranking submission progress	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repi001pxk8509h2exli	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2rem3000mxk8510mbhfxk	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.19	2026-04-29 13:02:03.985	2026-04-28 20:24:42.191	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf83005vxk85h1vrx5kj	RTC-011	Hackathons participation and output	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repg001nxk85cy0jzoeu	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2relx000kxk85gyr6w8bh	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.194	2026-04-29 13:02:03.985	2026-04-28 20:24:42.195	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf8q0061xk85ge923izh	RTC-014	Student category list A/B/C/D segmentation	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.218	2026-04-29 13:02:03.985	2026-04-28 20:24:42.219	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf8v0063xk85p8v3xe4v	RTC-015	Consolidated RTC Dashboard	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2ren2000yxk85nm65jskt	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.223	2026-04-29 13:02:03.985	2026-04-28 20:24:42.224	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf8z0065xk85dejog11i	PLC-001	Placement dashboard (overall status)	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repm001txk85n5iiu3dl	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rem9000oxk85i9jkdaor	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.227	2026-04-29 13:02:03.985	2026-04-28 20:24:42.228	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9b006bxk859tqnab90	PLC-004	Two-digit target — quality company conversion	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repq001vxk85ohnud2il	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2rem9000oxk85i9jkdaor	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.239	2026-04-29 13:02:03.985	2026-04-28 20:24:42.239	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9g006dxk85m3xma1o4	PLC-005	Training effectiveness — student improvement report	\N	cmoj2renl0012xk85vwlmtkom	cmoj2reps001xxk85dv2hhb48	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remc000pxk8521yejp9u	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.243	2026-04-29 13:02:03.985	2026-04-28 20:24:42.244	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9s006jxk85poj7oad7	PLC-008	Benchmarking comparison with other institutes	\N	cmoj2renl0012xk85vwlmtkom	cmoj2repq001vxk85ohnud2il	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2remf000qxk85378cc2mo	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.255	2026-04-29 13:02:03.985	2026-04-28 20:24:42.256	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rf9w006lxk85gjk1tvw8	AIC-001	Revenue model and proposal	\N	cmoj2renn0013xk857ix3cstf	cmoj2repw0021xk8562082kd5	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remi000rxk85875wfzaz	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.259	2026-04-29 13:02:03.985	2026-04-28 20:24:42.26	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfa8006rxk85ad087ahj	AIC-004	New schemes application tracker	\N	cmoj2renn0013xk857ix3cstf	cmoj2req10025xk85gyrd5dg1	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2reml000sxk85ey2klh5g	cmoj2rf13002xxk85dachrvmn	\N	Monthly	\N	\N	\N	NO	\N	2026-04-28 20:24:42.271	2026-04-29 13:02:03.985	2026-04-28 20:24:42.272	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfab006txk8556h6io5w	AIC-005	Concept note / proposal documents	\N	cmoj2renn0013xk857ix3cstf	cmoj2repw0021xk8562082kd5	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remi000rxk85875wfzaz	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.275	2026-04-29 13:02:03.985	2026-04-28 20:24:42.276	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfay006zxk85dqkqhja6	AIC-008	TEDx event execution plan	\N	cmoj2renn0013xk857ix3cstf	cmoj2repy0023xk85bwne7n70	cmoj2reqq002pxk85srkt5qsy	DROPPED	SELF_STRATEGY	\N	cmoj2remo000txk85sap1xuam	cmoj2rf13002xxk85dachrvmn	\N	Need-based	\N	\N	\N	NO	\N	2026-04-28 20:24:42.297	2026-04-29 13:02:03.985	2026-04-28 20:24:42.298	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfb10071xk857e4i3yo1	RGU-001	RGU prelaunch roadmap	\N	cmoj2renr0014xk8560p00ufi	cmoj2req50029xk85fupm22ow	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remr000uxk85z25w3yls	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.301	2026-04-29 13:02:03.985	2026-04-28 20:24:42.301	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfbh0079xk85zec0v8m8	RGU-005	Pride moments and change adoption strategy	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqa002fxk85uq4ylvo5	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remu000vxk85yuggo8sm	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.316	2026-04-29 13:02:03.985	2026-04-28 20:24:42.317	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmoj2rfbl007bxk85smdexoy7	RGU-006	Global Skill Passport framework	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	DROPPED	SELF_STRATEGY	\N	cmoj2remx000wxk85w6hm0dp2	cmoj2rf13002xxk85dachrvmn	\N	Weekly	\N	\N	\N	YES	\N	2026-04-28 20:24:42.32	2026-04-29 13:02:03.985	2026-04-28 20:24:42.321	2026-04-29 13:02:03.986	\N	\N	\N	\N	\N	\N
cmpdkpnfm00405tvm42qk2ry6	FDMPA-001	CDF HoD-Coat for lady faculties	\N	cmoxxs64l002y5tvm69ga2uj6	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:25:33.478	\N	2026-05-20 04:40:17.89	2026-06-10 06:25:33.479	\N	\N	\N	\N	\N	\N
cmok2zxyw0030p2zx8woiygko	RGU-014	Kit for IT employees	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqs002qxk85b5tuberg	WAITING_FOR_APPROVAL	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	YES	\N	2026-06-10 06:59:30.206	\N	2026-04-29 13:19:05.894	2026-06-10 06:59:30.209	\N	\N	\N	\N	\N	\N
cmol04e340008lltvpm473qod	MKT-051	Malayalam Video for Viscom	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-04 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:36:41.204	\N	2026-04-30 04:46:20.752	2026-06-10 06:36:41.205	\N	\N	\N	\N	\N	\N
cmol467yz008elltvjj75mv3k	MKT-061	Career Path in Fashion	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7p21qb008enlrehdxysiwb	cmoj2rf13002xxk85dachrvmn	2026-05-19 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:37:22.696	\N	2026-04-30 06:39:44.603	2026-06-10 06:37:22.697	\N	\N	\N	\N	\N	\N
cmokzhm2c000954jt2as9x713	MKT-045	Reel and Webinar sent to biology students in Raw data campaign	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	COMPLETED	DEPARTMENT_MEETING	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-04-30 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:14:03.01	\N	2026-04-30 04:28:38.004	2026-06-10 06:14:03.013	\N	\N	\N	\N	\N	\N
cmojmehr10003p2zxmb92v3uv	RGU-009	HBS Learning Review	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	DROPPED	DEPARTMENT_MEETING	\N	cmoj2remx000wxk85w6hm0dp2	cmoj2rf13002xxk85dachrvmn	2026-04-29 00:00:00	\N	Approval	\N	\N	YES	\N	2026-04-30 07:24:25.957	2026-04-30 07:25:25.096	2026-04-29 05:34:31.261	2026-04-30 07:25:25.097	\N	\N	\N	\N	\N	\N
cmq7r4xqq00d8nlreltdhfpeh	RSH-001	Research Board Meeting	\N	cmq7r3jvy00d2nlrev76jr1jz	\N	cmoj2reqs002qxk85b5tuberg	NOT_STARTED	SELF_STRATEGY	\N	cmq7r2f1p00d1nlrep4edud52	cmoj2reur002txk85m6ya4byh	2026-06-24 00:00:00	Monthly	\N	\N	\N	NO	\N	2026-06-10 07:33:14.065	\N	2026-06-10 07:33:14.066	2026-06-10 07:33:14.066	\N	\N	\N	\N	\N	\N
cmq7r82rl00drnlreykayyylu	REG-002	JD Dashboard	\N	cmoxy29h700375tvmbr0bhywf	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	BOSS_INSTRUCTION	\N	\N	cmoj2reur002txk85m6ya4byh	2026-06-11 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 07:35:40.545	\N	2026-06-10 07:35:40.546	2026-06-10 07:35:40.546	\N	\N	\N	\N	\N	\N
cmqeu96tl00glnlrejclj6v5x	RGU-077	Yellow card system to be implemented for attendance violations - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:23:32.846	\N	2026-06-15 06:34:54.538	2026-06-15 07:23:32.847	\N	\N	\N	\N	\N	\N
cmpfah9m10026zj6st3ss4wnd	RGU-057	VIP Guest List	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:29:35.095	\N	2026-05-21 09:29:22.921	2026-05-21 09:29:35.096	\N	\N	\N	\N	\N	\N
cmpfai432002hzj6sqi6tnypw	RGU-058	Chief Guest	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:30:10.269	\N	2026-05-21 09:30:02.414	2026-05-21 09:30:10.27	\N	\N	\N	\N	\N	\N
cmq7naffz002dnlreb7zuqr4s	MKT-101	Increase lead generation for RPET,RSAT	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	2026-06-13 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:16:27.733	\N	2026-06-10 05:45:31.823	2026-06-10 06:16:27.735	\N	\N	\N	\N	\N	\N
cmpfaizbs002szj6s4b9a2bnt	RGU-059	Commitment Card	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:30:54.007	\N	2026-05-21 09:30:42.904	2026-05-21 09:30:54.008	\N	\N	\N	\N	\N	\N
cmpv3cc1p0002zsl63cvbi0he	SSP-001	MBA Brochure	\N	cmoj2rent0015xk85js8spr5y	\N	cmoj2reqm002oxk85v8rq58a6	IN_PROGRESS	SELF_STRATEGY	\N	cmq7ntatd003snlre4m1hjjtw	cmoj2rf13002xxk85dachrvmn	2026-06-04 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 07:05:20.005	\N	2026-06-01 10:53:54.301	2026-06-10 07:05:20.008	\N	\N	\N	\N	\N	\N
cmpfak7bx0033zj6sqzxymmad	RGU-060	School Video Launching	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:31:49.126	\N	2026-05-21 09:31:39.933	2026-05-21 09:31:49.126	\N	\N	\N	\N	\N	\N
cmpfal5g6003ezj6shbl1fc0j	RGU-061	School Video Launching	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 09:32:32.306	\N	2026-05-21 09:32:24.151	2026-05-21 09:32:32.307	\N	\N	\N	\N	\N	\N
cmpfbvuqj003pzj6sjlpsmy1v	RGU-062	Self Booth Completed	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:09:11.652	\N	2026-05-21 10:08:43.1	2026-05-21 10:09:11.653	\N	\N	\N	\N	\N	\N
cmpfbz7d40040zj6siu2i1c96	CRT-040	RGU Ledger	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:11:34.093	\N	2026-05-21 10:11:19.433	2026-05-21 10:11:34.094	\N	\N	\N	\N	\N	\N
cmq584ycb001hnlrehrn5g1c1	MKT-098	Walkin Dashboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:56:31.864	\N	2026-06-08 13:05:49.788	2026-06-10 05:56:31.866	\N	\N	\N	\N	\N	\N
cmpfbzzk9004bzj6swpsiqka4	CRT-041	Table Mug	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:12:04.008	\N	2026-05-21 10:11:55.977	2026-05-21 10:12:04.008	\N	\N	\N	\N	\N	\N
cmq1zgucx000lnlrepx4yrq4i	RTC-019	AI assisted teaching	\N	cmoj2renh0011xk85ij9xbfhe	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7nim27002lnlre2crctjbi	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:58:41.571	\N	2026-06-06 06:39:49.425	2026-06-10 05:58:41.574	\N	\N	\N	\N	\N	\N
cmpfc0xqj004mzj6sahnyt67u	CRT-042	Mug	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:12:59.699	\N	2026-05-21 10:12:40.267	2026-05-21 10:12:59.7	\N	\N	\N	\N	\N	\N
cmpfc1ody004xzj6s7ryw72px	CRT-043	T-Shirt	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:13:25.426	\N	2026-05-21 10:13:14.807	2026-05-21 10:13:25.427	\N	\N	\N	\N	\N	\N
cmq7r6ib900dgnlreli5ui3zw	RGU-068	BBA Aviation Arivupattarai Plan	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	DEPARTMENT_MEETING	\N	cmq7ndj28002jnlregrv2smp4	cmoj2reur002txk85m6ya4byh	2026-06-16 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 07:34:39.471	\N	2026-06-10 07:34:27.382	2026-06-10 07:34:39.472	\N	\N	\N	\N	\N	\N
cmol0namz002klltv53v7voiu	RGU-023	School & RGU Flags Raised	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:10:53.786	\N	2026-04-30 05:01:02.747	2026-06-10 06:10:53.787	\N	\N	\N	\N	\N	\N
cmqeu9ol000gtnlre4g3q89uz	RGU-078	CAT plan needs to be prepared and monitored - Dr.Raje (CAT Team)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:24:23.93	\N	2026-06-15 06:35:17.557	2026-06-15 07:24:23.931	\N	\N	\N	\N	\N	\N
cmqeubm5y00h9nlre35vay5fk	RGU-080	Assessment process and evaluation framework need to be finalized - Dr.Raje (CAT Team)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:25:32.682	\N	2026-06-15 06:36:47.734	2026-06-15 07:25:32.683	\N	\N	\N	\N	\N	\N
cmqeuccux00hhnlre1z3cnhvd	RGU-081	Assessment outcomes and expected deliverables need to be finalized - Dr.Raje (CAT Team)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:25:59.134	\N	2026-06-15 06:37:22.329	2026-06-15 07:25:59.135	\N	\N	\N	\N	\N	\N
cmqeuedlg00hxnlreojqkaxpm	RGU-083	School of Media & Performing Arts - Attendance and learning outcomes need to be monitored regularly - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:27:50.078	\N	2026-06-15 06:38:56.597	2026-06-15 07:27:50.079	\N	\N	\N	\N	\N	\N
cmqew8dbm00kbnlredop4kuo1	RGU-087	School of Fashion Design - Student feedback to be collected regularly - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:30:15.537	\N	2026-06-15 07:30:15.538	2026-06-15 07:30:15.538	\N	\N	\N	\N	\N	\N
cmqew91d600kjnlre6ljn7wu3	RGU-088	School of Fashion Design - Uniform plan to be finalized - Dr.Aruna,Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:30:46.697	\N	2026-06-15 07:30:46.698	2026-06-15 07:30:46.698	\N	\N	\N	\N	\N	\N
cmpfcose3007szj6sqfa9w92a	RGU-063	Printed Diary for Academician	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:49:21.985	\N	2026-05-21 10:31:13.083	2026-06-10 06:49:21.987	\N	\N	\N	\N	\N	\N
cmpfcflg90074zj6slbd41xqb	CRT-050	Three cards	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-21 10:24:25.083	\N	2026-05-21 10:24:04.185	2026-05-21 10:24:25.084	\N	\N	\N	\N	\N	\N
cmpfcwkzl0083zj6syid80ji3	RGU-064	Printed Diary for Corporate	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:50:03.971	\N	2026-05-21 10:37:16.738	2026-06-10 06:50:03.972	\N	\N	\N	\N	\N	\N
cmqafcnk800ednlre4fggtb9s	MKT-103	Eachanari Bus stop Branding - Jimry	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-12 04:26:37.254	\N	2026-06-12 04:26:37.256	2026-06-12 04:26:37.256	\N	\N	\N	\N	\N	\N
cmqeub0o900h1nlrewaiidrf2	RGU-079	Assessment plan to be standardized and implemented commonly across all levels - Dr.Raje (CAT Team)	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:24:54.766	\N	2026-06-15 06:36:19.881	2026-06-15 07:24:54.767	\N	\N	\N	\N	\N	\N
cmqeudcjc00hpnlrevdk2mdm5	RGU-082	115 offer letters need to be collected and properly documented by the Placement Office - Siva sir	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:26:23.115	\N	2026-06-15 06:38:08.569	2026-06-15 07:26:23.116	\N	\N	\N	\N	\N	\N
cmqeuet0y00i5nlre93jnn1bp	RGU-084	School of Media & Performing Arts - Feedback to be collected for all events conducted - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:28:29.793	\N	2026-06-15 06:39:16.594	2026-06-15 07:28:29.794	\N	\N	\N	\N	\N	\N
cmqewcxpe00krnlrejzjny51u	RGU-089	School of Fashion Design - Demo Day calendar, concepts, and expected outcomes to be finalized - Department Team	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:33:48.577	\N	2026-06-15 07:33:48.578	2026-06-15 07:33:48.578	\N	\N	\N	\N	\N	\N
cmqeweiep00l7nlre2sk5d371	RGU-091	School of Fashion Design - Budget requirement for learning activities to be discussed and finalized - Dr.Aruna ,Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:35:02.064	\N	2026-06-15 07:35:02.066	2026-06-15 07:35:02.066	\N	\N	\N	\N	\N	\N
cmqewfx8700lnnlrez220usct	RGU-093	School of Psychology - Two days of casual dress plan can be considered for students - Dr.Seetha	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:36:07.926	\N	2026-06-15 07:36:07.927	2026-06-15 07:36:07.927	\N	\N	\N	\N	\N	\N
cmq58c4kq001pnlres3zw0z7z	MKT-099	Bharathiyar university Data Dshboard	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:55:55.123	\N	2026-06-08 13:11:24.459	2026-06-10 05:55:55.124	\N	\N	\N	\N	\N	\N
cmq2990eg000tnlreiiooserz	CRT-052	Chairman sir profile correction	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmpkuzvfo0000113wydfe7xak	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:58:15.078	\N	2026-06-06 11:13:40.168	2026-06-10 05:58:15.079	\N	\N	\N	\N	\N	\N
cmpryoz9f002mo3hnnaxdgaih	MKT-090	Individual analysis on 45 dropouts	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	COMPLETED	MRM	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-06-02 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:02:16.8	\N	2026-05-30 06:20:27.652	2026-06-10 06:02:16.802	\N	\N	\N	\N	\N	\N
cmpfet8hv008ezj6ss9vbk6ms	RTC-016	Preparation for Minor Degree Program and Student Offerings for 2nd & 3rd Year Student- Krishnaraj	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:04:55.494	\N	2026-05-21 11:30:39.812	2026-06-10 06:04:55.495	\N	\N	\N	\N	\N	\N
cmphuxagz000apua17ulbl6vy	MKT-076	Campaign for Bharathiyar Universtiy Data	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:27:31.274	\N	2026-05-23 04:37:15.203	2026-06-10 06:27:31.277	\N	\N	\N	\N	\N	\N
cmqaved8h00elnlres4mjfnpd	MKT-104	Student Undertaking-RGU,RTC,Pharmacy,Physio	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2reur002txk85m6ya4byh	2026-07-01 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-12 11:55:51.04	\N	2026-06-12 11:55:51.041	2026-06-12 11:55:51.041	\N	\N	\N	\N	\N	\N
cmqettjab00etnlre4xhpzr0l	RGU-069	Day-wise attendance percentage needs to be monitored and reviewed regularly - Dr.Manikandan	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:09:06.34	\N	2026-06-15 06:22:44.196	2026-06-15 07:09:06.341	\N	\N	\N	\N	\N	\N
cmqeu2utz00fpnlre2kcnxfsj	RGU-073	Feedback to be collected on MAT classes and LinkedIn Learning initiatives - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:12:05.04	\N	2026-06-15 06:29:59.063	2026-06-15 07:12:05.041	\N	\N	\N	\N	\N	\N
cmqewdrtf00kznlrexpwfvkb8	RGU-090	School of Fashion Design - Classes to be started for the 19 enrolled students with small deliverables and home assignments - Dr.Aruna	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:34:27.603	\N	2026-06-15 07:34:27.604	2026-06-15 07:34:27.604	\N	\N	\N	\N	\N	\N
cmqewf6as00lfnlre03ljgkmo	RGU-092	School of Psychology - UG First Year uniform plan to be prepared - Dr.Seetha	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:35:33.027	\N	2026-06-15 07:35:33.028	2026-06-15 07:35:33.028	\N	\N	\N	\N	\N	\N
cmq58de2a001xnlreupd44uws	MKT-100	Alumni Scholarship	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:56:09.994	\N	2026-06-08 13:12:23.41	2026-06-10 05:56:09.995	\N	\N	\N	\N	\N	\N
cmq57fwdb0011nlre6xctwu7g	RGU-066	Scholarship Target English-25 , Maths and Physic -50  - Pandi, Ramesh	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:57:39.575	\N	2026-06-08 12:46:20.831	2026-06-10 05:57:39.579	\N	\N	\N	\N	\N	\N
cmpfacacy0011zj6s66ij16ka	RGU-053	Hoarding for RGU with Jasmine advertisement - Pandi	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:06:05.247	\N	2026-05-21 09:25:30.61	2026-06-10 06:06:05.248	\N	\N	\N	\N	\N	\N
cmpgjtvb10002s5db01b4ovs5	RTC-017	M-lab location rename Room Allocation - Block Drawing - Krishnaraj	\N	cmoj2renh0011xk85ij9xbfhe	cmoj2repk001rxk85ra31dn56	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:04:11.475	\N	2026-05-22 06:38:53.628	2026-05-25 05:04:11.477	\N	\N	\N	\N	\N	\N
cmpfa2oat000izj6s6p58dzvq	RGU-052	Corporate & Academic Council Thank You Poster - Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2req7002bxk85n4v6gtmb	cmoj2reqq002pxk85srkt5qsy	DELAYED	SELF_STRATEGY	\N	cmoj2rell000gxk859tkogzrk	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:15:17.606	\N	2026-05-21 09:18:02.117	2026-06-10 06:15:17.607	\N	\N	\N	\N	\N	\N
cmpryweht003to3hnyf1frf4e	MKT-095	Separate page for each school in RGU website  and fix deadlines	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:19:32.254	\N	2026-05-30 06:26:13.985	2026-06-10 06:19:32.257	\N	\N	\N	\N	\N	\N
cmpryugsw003lo3hntfyj7ovp	MKT-094	Consultant admission for SRIET,Viscom,CDF and 45L budget is available	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:20:05.472	\N	2026-05-30 06:24:43.664	2026-06-10 06:20:05.498	\N	\N	\N	\N	\N	\N
cmpnlg6gb000to3hnewn024ck	MKT-082	Viscom sathish-School brochure(2)	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2remx000wxk85w6hm0dp2	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:02:40.933	\N	2026-05-27 04:58:37.355	2026-06-10 06:02:40.934	\N	\N	\N	\N	\N	\N
cmpryx73h0041o3hnkstx56ae	MKT-096	Walkin postmortem	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	COMPLETED	MRM	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:03:05.659	\N	2026-05-30 06:26:51.054	2026-06-10 06:03:05.66	\N	\N	\N	\N	\N	\N
cmpry4i0f001ao3hnutxvgk18	MKT-084	Concession for High cutoff seats and whatsapp push	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	MRM	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-05-30 06:04:32.174	\N	2026-05-30 06:04:32.175	2026-05-30 06:04:32.175	\N	\N	\N	\N	\N	\N
cmprysoa8003do3hn48t4lij2	MKT-093	Ad can be initiated for SRIET and some budget can be alloted	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:20:33.351	\N	2026-05-30 06:23:20.048	2026-06-10 06:20:33.353	\N	\N	\N	\N	\N	\N
cmpnldm02000lo3hn4chmma33	MKT-081	posters for courses with less admission - pandi	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:03:40.79	\N	2026-05-27 04:56:37.538	2026-06-10 06:03:40.792	\N	\N	\N	\N	\N	\N
cmphv4dle000ypua174r31sda	MKT-078	MBA Brochure - pandi	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:02:20.004	\N	2026-05-23 04:42:45.842	2026-05-25 05:02:20.006	\N	\N	\N	\N	\N	\N
cmphv0uym000ipua1oq8ukdpv	MKT-077	Sir B.Com Video  Ad runnig  impact - meghala	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:03:06.662	\N	2026-05-23 04:40:01.727	2026-05-25 05:03:06.663	\N	\N	\N	\N	\N	\N
cmphutio60002pua1o97gj4or	MKT-075	Zomato Ad  - meghala	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	cmoj2rejg0000xk85c5u73l07	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:03:58.165	\N	2026-05-23 04:34:19.205	2026-05-25 05:03:58.167	\N	\N	\N	\N	\N	\N
cmpkqsfyr0018qefwnqsa8a2c	MKT-080	Daily status of Untouched leads	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	MRM	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	2026-05-25 00:00:00	Daily	\N	\N	\N	NO	Update in BN admission updates	2026-05-25 05:04:49.106	\N	2026-05-25 05:04:49.107	2026-05-25 05:04:49.107	\N	\N	\N	\N	\N	\N
cmpfci8l4007hzj6s43khnz5e	CRT-051	Brown cover	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 05:06:04.993	\N	2026-05-21 10:26:07.48	2026-05-25 05:06:04.995	\N	\N	\N	\N	\N	\N
cmpfc2bu10058zj6s064iho1n	CRT-044	Water Bottle Branding	\N	cmol6xe3q009dlltva235e6ag	\N	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmpkuzvfo0000113wydfe7xak	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-05-25 11:52:34.672	\N	2026-05-21 10:13:45.194	2026-05-25 11:52:34.673	\N	\N	\N	\N	\N	\N
cmphv3006000qpua11czbfvsn	RGU-065	SIM Card Purchase - Ramesh	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	cmoj2rejx0003xk85byy6yh6g	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:04:19.277	\N	2026-05-23 04:41:41.575	2026-06-10 06:04:19.278	\N	\N	\N	\N	\N	\N
cmpkqiwda000bqefw7kjjtp6d	MKT-079	Digital Marketing Plan for MBA & MCA	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	COMPLETED	MRM	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-05-26 00:00:00	\N	\N	\N	Meeting is scheduled 	ONLY_IF_DELAYED	\N	2026-06-10 06:05:24.756	\N	2026-05-25 04:57:23.806	2026-06-10 06:05:24.757	\N	\N	\N	\N	\N	\N
cmpryn6hw0026o3hn5hxdebwc	MKT-088	Name change of  MA Journalism & Mass communication	\N	cmoj2rena0010xk85cuzrw5fp	\N	cmoj2reqq002pxk85srkt5qsy	COMPLETED	MRM	\N	\N	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:20:50.894	\N	2026-05-30 06:19:03.717	2026-06-10 06:20:50.895	\N	\N	\N	\N	\N	\N
cmpryrktn0035o3hnf705olzi	MKT-092	Increase ad for MCA and promote MCA among RGU RSmart CSE Courses	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:21:36.916	\N	2026-05-30 06:22:28.908	2026-06-10 06:21:36.918	\N	\N	\N	\N	\N	\N
cmpryqf1j002xo3hnuce4cxme	MKT-091	Increase admission for lateral entry	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7nukyb003tnlreoronk4xt	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:22:14.74	\N	2026-05-30 06:21:34.759	2026-06-10 06:22:14.745	\N	\N	\N	\N	\N	\N
cmpryo5fv002eo3hnxrep0wy8	MKT-089	Sports quota can be given for MBA IEV	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:22:55.771	\N	2026-05-30 06:19:49.003	2026-06-10 06:22:55.775	\N	\N	\N	\N	\N	\N
cmprymbb3001yo3hn22w5etc7	MKT-087	Ad initiation for Counselling Psychology and PGDM	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:23:49.578	\N	2026-05-30 06:18:23.295	2026-06-10 06:23:49.58	\N	\N	\N	\N	\N	\N
cmprykt7x001qo3hn8p7h4nww	MKT-086	Pure B.Com with Integrated CA training (Target 200 seats)	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:24:14.951	\N	2026-05-30 06:17:13.197	2026-06-10 06:24:14.954	\N	\N	\N	\N	\N	\N
cmpryjcoj001io3hn8v7n13dn	MKT-085	Full seat concession for accountancy	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	Present the data in next MRM	2026-06-10 06:25:04.698	\N	2026-05-30 06:16:05.107	2026-06-10 06:25:04.701	\N	\N	\N	\N	\N	\N
cmprxwnx20012o3hnb5m39hy7	MKT-083	Post Admission Process to be reviewed	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	MRM	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	To be present in next MRM	NO	\N	2026-06-10 06:26:42.112	\N	2026-05-30 05:58:26.583	2026-06-10 06:26:42.115	\N	\N	\N	\N	\N	\N
cmqetu6oe00f1nlreqxo683hw	RGU-070	Assessment feedback to be collected from students and analyzed for improvement - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:13:03.218	\N	2026-06-15 06:23:14.51	2026-06-15 07:13:03.219	\N	\N	\N	\N	\N	\N
cmpurcb6w002dp8dt7yh2bsa0	PLC-010	RGU Placement SOP	\N	cmoj2renl0012xk85vwlmtkom	\N	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	PLACEMENT_REVIEW	\N	cmq7offsd006anlre1tzmc5k1	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:18:09.547	\N	2026-06-01 05:17:57.8	2026-06-10 06:18:09.549	\N	\N	\N	\N	\N	\N
cmpuqw899001bp8dtudtx5te2	PLC-009	Entry of leads in the CRM & code generation for every company	\N	cmoj2renl0012xk85vwlmtkom	\N	cmoj2reqq002pxk85srkt5qsy	NOT_STARTED	PLACEMENT_REVIEW	\N	cmq7offsd006anlre1tzmc5k1	cmoj2rf13002xxk85dachrvmn	2026-06-06 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 06:19:00.967	\N	2026-06-01 05:05:27.501	2026-06-10 06:19:00.969	\N	\N	\N	\N	\N	\N
cmqetvdr200f9nlrevvvlbmy4	RGU-071	Target to place 281 students before July to be tracked and achieved -  Dr.MAnikandan	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:10:15.437	\N	2026-06-15 06:24:10.334	2026-06-15 07:10:15.438	\N	\N	\N	\N	\N	\N
cmq7n8f510025nlre1w31hx79	RAALE-003	SOP for Growth card and Skill Passport	\N	cmps0oof80003heomf5urdcuh	\N	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7nim27002lnlre2crctjbi	cmoj2rf13002xxk85dachrvmn	2026-06-16 00:00:00	\N	\N	\N	\N	NO	\N	2026-06-10 05:54:04.647	\N	2026-06-10 05:43:58.118	2026-06-10 05:54:04.649	\N	\N	\N	\N	\N	\N
cmq57h13a0019nlrejtmle83m	MKT-097	PGDM ad running - Meghala	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoz0019xk85wrsnjpt9	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7niwjj002mnlreu3l0t5tp	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:56:53.211	\N	2026-06-08 12:47:13.606	2026-06-10 05:56:53.214	\N	\N	\N	\N	\N	\N
cmq0vp5ie000anlrezeaf6fvx	RTC-018	Corporate Brochure	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	cmq7njicv002nnlrejd4j6jq9	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 05:59:15.628	\N	2026-06-05 12:06:32.486	2026-06-10 05:59:15.632	\N	\N	\N	\N	\N	\N
cmp3mbnx8003c5tvma6wxrd37	MKT-074	Change of flex in front of College(pharm and physio) to RGU	\N	cmoj2rena0010xk85cuzrw5fp	cmoj2reoq0017xk853xusa0cs	cmoj2reqm002oxk85v8rq58a6	COMPLETED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-10 06:09:08.679	\N	2026-05-13 05:27:42.811	2026-06-10 06:09:08.68	\N	\N	\N	\N	\N	\N
cmqeu4gl000fxnlrebbgbvsau	RGU-074	School of Commerce Fortnight bond can be collected and implemented for all schools - Dr.Krishnaraj	\N	cmoj2renr0014xk8560p00ufi	cmoj2reqd002hxk852vqpi4bf	cmoj2reqm002oxk85v8rq58a6	NOT_STARTED	SELF_STRATEGY	\N	\N	cmoj2rf13002xxk85dachrvmn	\N	\N	\N	\N	\N	NO	\N	2026-06-15 07:21:42.099	\N	2026-06-15 06:31:13.908	2026-06-15 07:21:42.102	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: TaskUpdate; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."TaskUpdate" (id, "taskId", "authorId", note, "newStatus", "createdAt") FROM stdin;
cmojmbobl0001p2zx73tgg3n0	cmoj2rfbu007fxk85h0y4vwoz	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Source: SELF STRATEGY → BOSS INSTRUCTION\n• Dr. BN intervention: YES → ONLY IF DELAYED\n• Status: NOT STARTED → COMPLETED\n• Deadline: — → 2026-05-08	COMPLETED	2026-04-29 05:32:19.809
cmojmfdsn0006p2zxi586ai6a	cmoj2rf38003lxk855f325tfs	cmoj2rf13002xxk85dachrvmn	🗑️ Dropped — Reason: duplicate	DROPPED	2026-04-29 05:35:12.791
cmok278uq000bp2zxt9jswygf	cmoj2rf2p003dxk85l9efx3vn	cmoj2rf13002xxk85dachrvmn	🗑️ Dropped — Reason: Duplicate	DROPPED	2026-04-29 12:56:46.976
cmok2e1h4000cp2zx8uu2u5ma	cmojmehr10003p2zxmb92v3uv	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000dp2zxp1zype9k	cmoj2rfbu007fxk85h0y4vwoz	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000ep2zxxcftwtv4	cmoj2rfbq007dxk85qyy9fw71	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000fp2zxens0e7rc	cmoj2rfbl007bxk85smdexoy7	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000gp2zxxx49jiov	cmoj2rfbh0079xk85zec0v8m8	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000hp2zxno0bte76	cmoj2rfbd0077xk85okt6e4p6	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000ip2zx4pxo74ix	cmoj2rfb90075xk85u0uzxzuj	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000jp2zxwricpd9n	cmoj2rfb50073xk85bx8vq010	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000kp2zxo1pz69vv	cmoj2rfb10071xk857e4i3yo1	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000lp2zxauhhm2xm	cmoj2rfat006xxk85zto6zx8w	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000mp2zx0848d6bq	cmoj2rfag006vxk85j3u1amd9	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000np2zxihe90yw6	cmoj2rfab006txk8556h6io5w	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000op2zxlmocz22d	cmoj2rfa4006pxk85309vyutn	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000pp2zxlvvwx8zi	cmoj2rf9w006lxk85gjk1tvw8	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000qp2zxjp7zqukn	cmoj2rf9n006hxk85ozjsb0m8	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000rp2zxv0q9guhy	cmoj2rf9g006dxk85m3xma1o4	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000sp2zx45r48dur	cmoj2rf9b006bxk859tqnab90	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000tp2zx1i14d2vu	cmoj2rf970069xk85d4pycyw9	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000up2zxvmr4z15w	cmoj2rf930067xk85kohi4jd8	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000vp2zxdmiepwlh	cmoj2rf8z0065xk85dejog11i	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000wp2zxm4r5ytt6	cmoj2rf8v0063xk85p8v3xe4v	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000xp2zxqcf9yzkm	cmoj2rf8q0061xk85ge923izh	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000yp2zxtgozxfwo	cmoj2rf7r005pxk85s2nvj1bj	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4000zp2zx84ksqbia	cmoj2rf7g005lxk85flgmwwrb	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40010p2zx9ndnn6cu	cmoj2rf7c005jxk851ktrk6he	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40011p2zxpur05l6t	cmoj2rf70005dxk85bx26ggqx	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40012p2zxukiivc1j	cmoj2rf6w005bxk85g9hcrkmc	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40013p2zxyd9cm4bg	cmoj2rf6r0059xk85mzvr5tej	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40014p2zx5rregmjj	cmoj2rf6m0057xk85a0911n93	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40015p2zx0ccg5gpb	cmoj2rf6a0051xk85qvoaw48d	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40016p2zxjx9z6tli	cmoj2rf6e0053xk85dezf0riu	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40017p2zxmmch9les	cmoj2rf66004zxk85cxq07n7z	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40018p2zx1574af18	cmoj2rf62004xxk85970hpin9	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h40019p2zxr18itppk	cmoj2rf5t004txk85yrue2130	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4001ap2zxllyr90tu	cmoj2rf5l004pxk85z2pmubqt	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h4001bp2zxu2kavqc8	cmoj2rf5h004nxk85w5gfjbzw	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001cp2zxxt3mtdo4	cmoj2rf5d004lxk851n1731tw	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001dp2zxw10ff08t	cmoj2rf59004jxk85oxjmb7bo	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001ep2zxa6rkqawv	cmoj2rf54004hxk85f3eevkbx	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001fp2zxedlk3exo	cmoj2rf4n0049xk8505zv1fy0	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001gp2zxmjuyhgsd	cmoj2rf4r004bxk85gte0d4hn	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001hp2zx3l0n056n	cmoj2rf4j0047xk85r5mkphdo	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001ip2zxhc9qac6r	cmoj2rf4e0045xk85ytihkscc	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001jp2zxejnrxn5a	cmoj2rf4a0043xk854put8f0a	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001kp2zx360gus7r	cmoj2rf460041xk855me2p549	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001lp2zxgittz83x	cmoj2rf41003zxk8529pe158d	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001mp2zxz2u3b6qa	cmoj2rf3d003nxk85xeihqzcd	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001np2zxg93y7dg8	cmoj2rf33003jxk85nv7d9keq	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001op2zx9k44fo1s	cmoj2rf2k003bxk857gajcoce	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001pp2zx9hoj58dv	cmoj2rf2f0039xk85z51lr3qo	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001qp2zxzfuxmzu3	cmoj2rf2b0037xk85k2xod7pv	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001rp2zxn5qopop0	cmoj2rf220035xk85ao72mwp7	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001sp2zxpk0auhid	cmoj2rf1v0033xk856s2jr7jo	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001tp2zxty3gqe3m	cmoj2rf1q0031xk854hu553ra	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001up2zxvcqh2fib	cmoj2rf1e002zxk85a6knzd80	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001vp2zxlfibxqpa	cmoj2rfay006zxk85dqkqhja6	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001wp2zx9camrap8	cmoj2rfa8006rxk85ad087ahj	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001xp2zxini8szgt	cmoj2rfa0006nxk85dyiqkooo	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001yp2zxrvzgpges	cmoj2rf9s006jxk85poj7oad7	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5001zp2zxiy35pmol	cmoj2rf9j006fxk85claw34n2	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50020p2zxlkws2k6u	cmoj2rf8n005zxk8503mihl5b	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50021p2zxddl62e9z	cmoj2rf8j005xxk85ntclqmzr	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50022p2zx5yfyi6dw	cmoj2rf83005vxk85h1vrx5kj	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50023p2zx7qfwidz2	cmoj2rf7z005txk85fmvi11bd	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50024p2zxh9rm0tct	cmoj2rf7v005rxk853uaqxdxw	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50025p2zxqe2o6ufh	cmoj2rf7m005nxk85h985pwih	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50026p2zxiicmo78o	cmoj2rf78005hxk85t4gxqg1i	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50027p2zxe491d9dl	cmoj2rf6i0055xk85dsf5jthm	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50028p2zxemp9tlq7	cmoj2rf74005fxk85i21q9f93	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h50029p2zxsvaen5rb	cmoj2rf5y004vxk85j13tskgn	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002ap2zxu75sjx80	cmoj2rf5p004rxk85kocrovii	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002bp2zxegoipsqz	cmoj2rf50004fxk85ev9ju272	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002cp2zxqqht1yj1	cmoj2rf4v004dxk85eirl2wq3	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002dp2zxd2fcquch	cmoj2rf3x003xxk856ji2hsir	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002ep2zxgtmxzh0s	cmoj2rf3t003vxk85zqtt56nd	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002fp2zxgkvlrxmk	cmoj2rf3p003txk858p0zzwkz	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002gp2zxc9k1dhqp	cmoj2rf3h003pxk859rl0ut4u	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002hp2zxw2cq3crc	cmoj2rf3l003rxk85chlzwofl	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002ip2zxfb5ltxwd	cmoj2rf2y003hxk85sjzz4zqn	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2e1h5002jp2zxcp2c29xc	cmoj2rf2t003fxk85zqlwg3pa	cmoj2rf13002xxk85dachrvmn	🗑️ Bulk dropped.	DROPPED	2026-04-29 13:02:04.006
cmok2l5ef002pp2zxmp812dfx	cmoj2rf38003lxk855f325tfs	cmoj2rf13002xxk85dachrvmn	♻️ Restored from Dropped Archive.	NOT_STARTED	2026-04-29 13:07:35.704
cmokyz2lw000b6gwxw922sbc6	cmokyz0lj00056gwx44561j9c	cmoj2rf13002xxk85dachrvmn	In Progress	\N	2026-04-30 04:14:12.981
cmokz3mrb000k6gwx7qrb4468	cmokz3aos000f6gwxkkqpf8lv	cmoj2rf13002xxk85dachrvmn	Meeting Completed	COMPLETED	2026-04-30 04:17:45.719
cmol05qwb000dlltvbmpvejnn	cmol04e340008lltvpm473qod	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: BCom Video by Hema → Malayalam Video for Viscom	\N	2026-04-30 04:47:24.011
cmol0a69r001slltvubbk9s7c	cmol08emp001blltv3bod4x30	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-06	\N	2026-04-30 04:50:50.56
cmol0kita0021lltv3xxg13k9	cmol0kdf3001wlltvu4o07lfs	cmoj2rf13002xxk85dachrvmn	Fabrication is yet to be completed.	\N	2026-04-30 04:58:53.374
cmol0m3lk0029lltv8be2w8kf	cmol0lvg60024lltvu09l47i0	cmoj2rf13002xxk85dachrvmn	Printing in progress	\N	2026-04-30 05:00:06.968
cmol0nhpp002plltv66eiomro	cmol0namz002klltv53v7voiu	cmoj2rf13002xxk85dachrvmn	Design is yet to be received.	\N	2026-04-30 05:01:11.917
cmol0p6ap002xlltvqvw3trct	cmol0ozaa002slltvl985mqwz	cmoj2rf13002xxk85dachrvmn	Yet to receive the courier.	\N	2026-04-30 05:02:30.433
cmol0q7zm0035lltvh37kl4dx	cmol0q5d60030lltvu45rxwgm	cmoj2rf13002xxk85dachrvmn	Design is yet to be received.	\N	2026-04-30 05:03:19.283
cmol0tx46003plltv1i9etsmn	cmol0tbtd003klltvlqk9t6ab	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: Design is yet to be received. → Name Badge	\N	2026-04-30 05:06:11.815
cmol0u6ja003slltvdy7v5z88	cmol0tbtd003klltvlqk9t6ab	cmoj2rf13002xxk85dachrvmn	Under fabrication	\N	2026-04-30 05:06:24.022
cmol0uyxi0040lltv5qnnx0gw	cmol0ur96003vlltvwgpsga8u	cmoj2rf13002xxk85dachrvmn	Design is yet to be received.	\N	2026-04-30 05:07:00.822
cmol0vje00048lltvfbsp19je	cmol0vbzl0043lltvf64fhdzs	cmoj2rf13002xxk85dachrvmn	Design is yet to be received.	\N	2026-04-30 05:07:27.337
cmol0wpji004glltvw1b0321q	cmol0wjbw004blltvgwksns1y	cmoj2rf13002xxk85dachrvmn	Design is yet to be received.	\N	2026-04-30 05:08:21.967
cmol0z2yt004ulltvu4utvwqh	cmol0y697004plltveig2mw0j	cmoj2rf13002xxk85dachrvmn	Fabrication is yet to be completed.	\N	2026-04-30 05:10:12.677
cmol0znii0052lltvlp4sl56r	cmol0zhra004xlltvdsx00o5o	cmoj2rf13002xxk85dachrvmn	Fabrication is yet to be completed.	\N	2026-04-30 05:10:39.306
cmol16o9d006glltvqh1qn85a	cmol0vbzl0043lltvf64fhdzs	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P2 Important → P3 Operational	\N	2026-04-30 05:16:06.865
cmol2td5h007ylltvjsjgstvf	cmol04e340008lltvpm473qod	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-04	\N	2026-04-30 06:01:45.173
cmol2uf9g0081lltv6ggzpd1n	cmol06fki000hlltv11tjdlse	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-01	\N	2026-04-30 06:02:34.564
cmol2vdpt0084lltvcoakle4w	cmol06rf2000nlltv4xh76si4	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-04	\N	2026-04-30 06:03:19.218
cmol2wy9r0087lltv0ua4bqt5	cmol07esr000tlltvqyfe4tg3	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-04	\N	2026-04-30 06:04:32.511
cmol2xo0y008alltvmhfff33s	cmol07stu000zlltv5nmnrjwv	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-02	\N	2026-04-30 06:05:05.891
cmol4fmee008klltv95rwyfhm	cmol08vuj001hlltvfoy03mnn	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-01	\N	2026-04-30 06:47:03.206
cmol4i27w008nlltvyr6qtmnp	cmol098n3001nlltvlhm9wq3q	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: — → 2026-05-05	\N	2026-04-30 06:48:57.02
cmol4mrt00092lltvdcfsupr9	cmol4k5xn008rlltv2ohqwnw3	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-04-30 06:52:36.786
cmol5roxt0096lltv1v6xrqig	cmojmehr10003p2zxmb92v3uv	cmoj2rf13002xxk85dachrvmn	♻️ Restored from Dropped Archive.	NOT_STARTED	2026-04-30 07:24:25.985
cmol5syjv0098lltv3i60z8fv	cmojmehr10003p2zxmb92v3uv	cmoj2rf13002xxk85dachrvmn	🗑️ Dropped — Reason: DUPLICATE	DROPPED	2026-04-30 07:25:25.1
cmol6gfpq009clltvttucuat6	cmol4kulc008xlltv54vb97a6	cmoj2rf13002xxk85dachrvmn	completed	\N	2026-04-30 07:43:40.407
cmol700wz009hlltv0zwrr1v1	cmol13mem005tlltvw9p6cjar	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Vertical: RGU → Creative	\N	2026-04-30 07:58:54.298
cmolbnl61000c5tvmov259qrf	cmol4kulc008xlltv54vb97a6	cmoj2rf13002xxk85dachrvmn	coml	\N	2026-04-30 10:09:12.152
cmolbsn9s000e5tvm5tzrrth7	cmol4kulc008xlltv54vb97a6	cmoj2rf13002xxk85dachrvmn	in progress	\N	2026-04-30 10:13:08.176
cmosipe7e00255tvmxasr3b3l	cmol4kulc008xlltv54vb97a6	cmoj2rf13002xxk85dachrvmn	coml	COMPLETED	2026-05-05 11:00:57.001
cmoskqk5r00285tvmn8ywhwxw	cmol4kulc008xlltv54vb97a6	cmoj2rf13002xxk85dachrvmn	COM	IN_PROGRESS	2026-05-05 11:57:50.587
cmowgnwvh002b5tvm7qrnxl5k	cmol0namz002klltv53v7voiu	cmoj2rf13002xxk85dachrvmn	Completed	\N	2026-05-08 05:14:53.34
cmowgp3mg002e5tvm56iz2s2j	cmokzkqep000f54jt9bba10eo	cmoj2rf13002xxk85dachrvmn	Completed	\N	2026-05-08 05:15:48.76
cmpdksnx800455tvmh57ecwz1	cmpdkpnfm00405tvm42qk2ry6	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-20 04:42:38.49
cmpezg8h8001kuycditjqxvml	cmol162tr006blltve6vh3d4f	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:20:39.02
cmpezgwkg001ouycdb3x4xgro	cmokyz0lj00056gwx44561j9c	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:21:10.222
cmpezhlet001suycd6dkosztv	cmokzkqep000f54jt9bba10eo	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:21:42.437
cmpezi8kv001wuycdct97qecj	cmok2wc9o002xp2zxrnrr0w23	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:22:12.464
cmpezj2ba0020uycdlmyc1xub	cmol13mem005tlltvw9p6cjar	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:22:50.998
cmpezklmr0024uycdkf26j5jq	cmol118h5005nlltvbyzbaqbm	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:24:02.692
cmpezlp420027uycds0q0gbef	cmol151n3005zlltvsrj80evq	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Vertical: RGU → Creative	\N	2026-05-21 04:24:53.858
cmpezm0b8002buycdrfyszeev	cmol151n3005zlltvsrj80evq	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:25:08.373
cmpezmpgc002fuycdg5sfhysj	cmol0y697004plltveig2mw0j	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:25:40.957
cmpezo4co002kuycdcqcnfbgn	cmol0tbtd003klltvlqk9t6ab	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:26:46.92
cmpezsvhu002quycdfn0gb20p	cmol0sawt003elltvjks06c8c	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 04:30:28.722
cmpfa6lg4000xzj6sjovx6snh	cmpfa4y3z000qzj6sjx7ty4bu	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Vertical: Registrar → RGU\n• Sub-vertical: — → Launch	\N	2026-05-21 09:21:05.045
cmpfaeo1c001gzj6spk2zelwa	cmpfaegdo0019zj6sn12qsnio	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:27:21.649
cmpfafnui001rzj6spqlgy7d7	cmpfafdfh001kzj6siu3h74vj	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:28:08.059
cmpfagi6a0022zj6sudu8m0pd	cmpfaga3h001vzj6sdvytoluj	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:28:47.363
cmpfahj05002dzj6sely6brd9	cmpfah9m10026zj6st3ss4wnd	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:29:35.094
cmpfaia57002ozj6sfm5sbn0m	cmpfai432002hzj6sqi6tnypw	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:30:10.267
cmpfaj7w3002zzj6sal7w44a0	cmpfaizbs002szj6s4b9a2bnt	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:30:54.003
cmpfakef8003azj6s94ab60id	cmpfak7bx0033zj6sqzxymmad	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:31:49.124
cmpfalbqo003lzj6sl75zba57	cmpfal5g6003ezj6shbl1fc0j	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 09:32:32.304
cmpfbwgrk003wzj6sg4b8cv3a	cmpfbvuqj003pzj6sjlpsmy1v	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:09:11.648
cmpfbziob0047zj6s2ssj868l	cmpfbz7d40040zj6siu2i1c96	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:11:34.091
cmpfc05ra004izj6su6lam2ck	cmpfbzzk9004bzj6swpsiqka4	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:12:04.006
cmpfc1cq9004tzj6srtvrlra2	cmpfc0xqj004mzj6sahnyt67u	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:12:59.697
cmpfc1wkw0054zj6sgv5redf8	cmpfc1ody004xzj6s7ryw72px	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:13:25.424
cmpfc6nue005fzj6s7rqthtzs	cmpfc2bu10058zj6s064iho1n	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:17:07.382
cmpfc798r005qzj6sjw0bwkp5	cmpfc71hy005jzj6scsls5rev	cmoj2rf13002xxk85dachrvmn	Completed	\N	2026-05-21 10:17:35.115
cmpfc7nci005szj6sdhu2u6sr	cmpfc71hy005jzj6scsls5rev	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:17:53.395
cmpfcai5a0063zj6srk43jpwl	cmpfca04o005wzj6shjgigi7b	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:20:06.622
cmpfcb5fp006ezj6s0hwzduyv	cmpfcaugd0067zj6sqe5iq5qh	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:20:36.805
cmpfcenay006pzj6s06klvm6v	cmpfceg3g006izj6s2sgk43p6	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:23:19.93
cmpfcf7dl0070zj6s3az48ofr	cmpfcf0sj006tzj6seumx3m7g	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:23:45.945
cmpfcft9h007bzj6s37jcgn0g	cmpfcflg90074zj6slbd41xqb	cmoj2rf13002xxk85dachrvmn	Completed	\N	2026-05-21 10:24:14.31
cmpfcg1kp007dzj6swnjcvq7w	cmpfcflg90074zj6slbd41xqb	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:24:25.081
cmpfcigsj007ozj6shqjmqfce	cmpfci8l4007hzj6s43khnz5e	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:26:18.115
cmpfcp33n007zzj6syls4z4ce	cmpfcose3007szj6sqfa9w92a	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:31:26.963
cmpfcwslc008azj6sf7wwgu1o	cmpfcwkzl0083zj6syid80ji3	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-21 10:37:26.592
cmphvjlet0016pua1mgi66b6x	cmphutio60002pua1o97gj4or	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-23 04:54:35.813
cmpkqd6h80001qefwum9sl4jh	cmphutio60002pua1o97gj4or	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: Zomato Ad  - Magala → Zomato Ad  - meghala	\N	2026-05-25 04:52:56.954
cmpkqeei80004qefw7s2ah1x0	cmphv0uym000ipua1oq8ukdpv	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: Sir B.Com Vedio  Ad runnig  impact - Megala → Sir B.Com Video  Ad runnig  impact - meghala	\N	2026-05-25 04:53:54.032
cmpkqis0p0007qefw6scaxpda	cmphuxagz000apua17ulbl6vy	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: Campaign for Bharathiyar Universtiy Data - Pandi, Megala → Campaign for Bharathiyar Universtiy Data - Pandi, meghala	\N	2026-05-25 04:57:18.169
cmpkqla5p000iqefw731krrhr	cmphv4dle000ypua174r31sda	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Owner role: — → Admission Manager	\N	2026-05-25 04:59:14.989
cmpkqljnv000lqefwrvu8cjw9	cmphv4dle000ypua174r31sda	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-25 04:59:27.307
cmpkqn5ub000oqefw0bruv7jm	cmpfa2oat000izj6s6p58dzvq	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important\n• Owner role: — → RTC Head	\N	2026-05-25 05:00:42.707
cmpkqpon6000uqefwx751k306	cmphuxagz000apua17ulbl6vy	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:02:40.387
cmpkqp8xa000rqefw13bqfz93	cmphv4dle000ypua174r31sda	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:02:20.015
cmpkqq8wz000yqefw174uayix	cmphv0uym000ipua1oq8ukdpv	cmoj2rf13002xxk85dachrvmn	Completed	COMPLETED	2026-05-25 05:03:06.659
cmpkqrcnt0011qefwsnkl3vvp	cmphutio60002pua1o97gj4or	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:03:58.17
cmpkqrmxk0014qefww4ezlxnd	cmpgjtvb10002s5db01b4ovs5	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:04:11.481
cmpkqu2iw001fqefwqc39mv0o	cmpfci8l4007hzj6s43khnz5e	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:06:05
cmpkqvwmy001iqefw4a64u4gx	cmpfcwkzl0083zj6syid80ji3	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:07:30.682
cmpkqwd9v001lqefw4ixghat1	cmpfcose3007szj6sqfa9w92a	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:07:52.243
cmpkqwmg3001oqefw7mz8gc5q	cmpfceg3g006izj6s2sgk43p6	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Priority: P1 Critical → P2 Important	\N	2026-05-25 05:08:04.131
cmpl5b6j60001o3hnovtwpjg5	cmpfc2bu10058zj6s064iho1n	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Owner role: — → Team Leader	\N	2026-05-25 11:51:17.97
cmpryppxg002to3hnganyschu	cmpryoz9f002mo3hnnaxdgaih	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Deadline: 2026-06-06 → 2026-06-02	\N	2026-05-30 06:21:02.212
cmpurjy8o002mp8dt7lxzohft	cmol17wd3006klltvk73gxk83	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-01 05:23:54.264
cmq0vvfcu000hnlrell0p3ght	cmq0vp5ie000anlrezeaf6fvx	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Vertical: RTC → RGU	\N	2026-06-05 12:11:25.182
cmq7nlf5b002unlreaw8zi4j2	cmq7n8f510025nlre1w31hx79	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: Training Head → Dr.Arun Kumar	\N	2026-06-10 05:54:04.655
cmq7nm47b002xnlred57ovgly	cmq58de2a001xnlreupd44uws	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 05:54:37.109
cmq7nmzac0030nlre1hkscuy5	cmq58c4kq001pnlres3zw0z7z	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Meghala	\N	2026-06-10 05:55:17.413
cmq7nnse10033nlred4kbhaa6	cmq58c4kq001pnlres3zw0z7z	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Bharathiyar university Data Dshboard - Meghala → Bharathiyar university Data Dshboard	\N	2026-06-10 05:55:55.129
cmq7no3v30036nlrew7269k72	cmq58de2a001xnlreupd44uws	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Alumni Scholarship - Pandi → Alumni Scholarship	\N	2026-06-10 05:56:09.999
cmq7nokqm0039nlretv8nvqfn	cmq584ycb001hnlrehrn5g1c1	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Walkin Dashboard - Maghala → Walkin Dashboard\n• Owner role: — → Meghala	\N	2026-06-10 05:56:31.87
cmq7np17l003cnlrejdi9t0br	cmq57h13a0019nlrejtmle83m	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Meghala	\N	2026-06-10 05:56:53.218
cmq7nq0zk003fnlrefzrx32es	cmq57fwdb0011nlre6xctwu7g	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Marketing\n• Sub-vertical: Academic Setup → Physical Marketing\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 05:57:39.584
cmq7nqsdm003inlreafdza5uz	cmq2990eg000tnlreiiooserz	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: chairman sir profile correction → Chairman sir profile correction	\N	2026-06-10 05:58:15.082
cmq7nrctl003lnlrejcm239yr	cmq1zgucx000lnlrepx4yrq4i	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: AI assisted teaching  - Dr. Arun → AI assisted teaching\n• Owner role: Academic Head → Dr.Arun Kumar	\N	2026-06-10 05:58:41.577
cmq7ns33n003onlreodc1uczc	cmq0vp5ie000anlrezeaf6fvx	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Marketing\n• Sub-vertical: — → Physical Marketing\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 05:59:15.636
cmq7nvawy003vnlreorb9szv1	cmpryoz9f002mo3hnnaxdgaih	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:01:45.73
cmq7nvyw6003xnlre9uk363lw	cmpryoz9f002mo3hnnaxdgaih	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:02:16.806
cmq7nwhi70040nlre0htyvvoq	cmpnlg6gb000to3hnewn024ck	cmoj2reur002txk85m6ya4byh	🔄 Status → COMPLETED	COMPLETED	2026-06-10 06:02:40.927
cmq7nx0l40043nlresm0zovjc	cmpryx73h0041o3hnkstx56ae	cmoj2reur002txk85m6ya4byh	🔄 Status → COMPLETED	COMPLETED	2026-06-10 06:03:05.656
cmq7nxrp80046nlreu2jwrxzr	cmpnldm02000lo3hn4chmma33	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: Senior Manager → Pandi Elavarasan	\N	2026-06-10 06:03:40.796
cmq7nyleb0049nlre2sw8xm6k	cmphv3006000qpua11czbfvsn	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:04:19.283
cmq7nzdc2004cnlret8b2zbyh	cmpfet8hv008ezj6ss9vbk6ms	cmoj2reur002txk85m6ya4byh	🔄 Status → COMPLETED	COMPLETED	2026-06-10 06:04:55.49
cmq7nzzx4004fnlrejiw8kq93	cmpkqiwda000bqefw7kjjtp6d	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:05:24.76
cmq7o0l5t004inlre9k9yule1	cmpfacacy0011zj6s66ij16ka	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:05:52.29
cmq7o0v5l004lnlrep4ahd0t5	cmpfacacy0011zj6s66ij16ka	cmoj2reur002txk85m6ya4byh	complerted	\N	2026-06-10 06:06:05.242
cmq7o1v9g004nnlre2hw6yzuk	cmpfa4y3z000qzj6sjx7ty4bu	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Corporate & Academic Council Create a On Boarding poster - Arunraaj → Corporate & Academic Council Create a On Boarding poster\n• Owner role: — → Arunraaj Manickaraj\n• Status: NOT STARTED → PARKED	PARKED	2026-06-10 06:06:52.036
cmq7o2fe1004qnlreo6qwbm99	cmpfa4y3z000qzj6sjx7ty4bu	cmoj2reur002txk85m6ya4byh	Parked	\N	2026-06-10 06:07:18.121
cmq7o3a17004snlreinn3fead	cmpf9jmvi0002zj6s9wk6za3r	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:07:57.835
cmq7o3nke004vnlreft1tz27s	cmpf9jmvi0002zj6s9wk6za3r	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:08:15.374
cmq7o4jbd004xnlrec1232z77	cmp3mbnx8003c5tvma6wxrd37	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:08:56.522
cmq7o4sp00050nlreh286hsgz	cmp3mbnx8003c5tvma6wxrd37	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:09:08.677
cmq7o5bf10052nlre0ijmyeqb	cmol0namz002klltv53v7voiu	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:09:32.941
cmq7o5i1h0055nlrea3w61h6m	cmol0namz002klltv53v7voiu	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:09:41.525
cmq7o5xlt0057nlrep029vgzs	cmol0namz002klltv53v7voiu	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:10:01.697
cmq7o6ms70059nlre7mzp0uea	cmol0namz002klltv53v7voiu	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:10:34.327
cmq7o71so005bnlrebyu870f6	cmol0namz002klltv53v7voiu	cmoj2reur002txk85m6ya4byh	Completed	\N	2026-06-10 06:10:53.784
cmq7o7r9f005dnlretgbsfpxk	cmokzwsjv001f54jt5w5et3uh	cmoj2reur002txk85m6ya4byh	Parked	PARKED	2026-06-10 06:11:26.787
cmq7o80av005gnlre57xht0qi	cmokzwsjv001f54jt5w5et3uh	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Dr.Arun Kumar	\N	2026-06-10 06:11:38.504
cmq7o8s6r005jnlregkxxblln	cmol4kulc008xlltv54vb97a6	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: IN PROGRESS → DELAYED	DELAYED	2026-06-10 06:12:14.643
cmq7o8x74005mnlrex1wppnig	cmol4kulc008xlltv54vb97a6	cmoj2reur002txk85m6ya4byh	Delayed	\N	2026-06-10 06:12:21.137
cmq7o9mfv005onlre79r0fayj	cmol4kulc008xlltv54vb97a6	cmoj2reur002txk85m6ya4byh	🔄 Status → PARKED	PARKED	2026-06-10 06:12:53.851
cmq7oad4k005rnlre3io80dmt	cmokzshsf001354jtd0pmqgwl	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:13:28.437
cmq7ob3t6005unlre98wib0vv	cmokzhm2c000954jt2as9x713	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Pandi Elavarasan\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:14:03.019
cmq7obzc8005xnlrejbw30z53	cmok2s20r002up2zxw7td5pdy	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Dr.Raje\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:14:43.881
cmq7ocpd70060nlrebweh0nax	cmpfa2oat000izj6s6p58dzvq	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → DELAYED	DELAYED	2026-06-10 06:15:17.611
cmq7od75o0063nlret03dahuu	cmoj2rf38003lxk855f325tfs	cmoj2reur002txk85m6ya4byh	🔄 Status → COMPLETED	COMPLETED	2026-06-10 06:15:40.668
cmq7oe7h60068nlre6hygsz38	cmq7naffz002dnlreb7zuqr4s	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: Website Team → Meghala	\N	2026-06-10 06:16:27.739
cmq7oge1c006cnlre0h17a7vx	cmpurcb6w002dp8dt7yh2bsa0	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Dr.Sivasubramaniam	\N	2026-06-10 06:18:09.553
cmq7ohhpp006fnlresivq5pdw	cmpuqw899001bp8dtudtx5te2	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Dr.Sivasubramaniam	\N	2026-06-10 06:19:00.973
cmq7oi5ut006inlreantdbdb6	cmpryweht003to3hnyf1frf4e	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Sub-vertical: — → Digital Marketing\n• Owner role: — → Meghala	\N	2026-06-10 06:19:32.261
cmq7oivi9006lnlreq8wghqnl	cmpryugsw003lo3hntfyj7ovp	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Sub-vertical: — → Physical Marketing\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:20:05.506
cmq7ojgzw006onlreruj68sn6	cmprysoa8003do3hn48t4lij2	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Meghala	\N	2026-06-10 06:20:33.357
cmq7ojuj9006rnlrexj4jzf0k	cmpryn6hw0026o3hn5hxdebwc	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:20:50.902
cmq7oku1l006unlreu3ykewow	cmpryrktn0035o3hnf705olzi	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Increase ad for MCA and promote MCA among RCAS RSmart CSE Courses → Increase ad for MCA and promote MCA among RGU RSmart CSE Courses\n• Owner role: — → Meghala	\N	2026-06-10 06:21:36.921
cmq7oln8e006xnlre70rk50e6	cmpryqf1j002xo3hnuce4cxme	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Sub-vertical: — → Physical Marketing\n• Owner role: — → Ramesh	\N	2026-06-10 06:22:14.75
cmq7omiw30070nlremc6lbd8y	cmpryo5fv002eo3hnxrep0wy8	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Sub-vertical: — → Physical Marketing\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:22:55.779
cmq7onoen0073nlrezja55y6q	cmprymbb3001yo3hn22w5etc7	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Meghala	\N	2026-06-10 06:23:49.584
cmq7oo7zh0076nlre4v4kh87j	cmprykt7x001qo3hn8p7h4nww	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:24:14.957
cmq7opade0079nlrej46y52dz	cmpryjcoj001io3hn8v7n13dn	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Sub-vertical: — → Physical Marketing\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:25:04.706
cmq7opwlb007cnlreje9cm8yh	cmpdkpnfm00405tvm42qk2ry6	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:25:33.485
cmq7oqe8e007fnlreuojdjunv	cmol0zhra004xlltvdsx00o5o	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:25:56.366
cmq7ordja007inlreq7lasqnn	cmprxwnx20012o3hnb5m39hy7	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: Admission Manager → Pandi Elavarasan	\N	2026-06-10 06:26:42.118
cmq7osfgx007lnlre439rk4jn	cmphuxagz000apua17ulbl6vy	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Campaign for Bharathiyar Universtiy Data - Pandi, meghala → Campaign for Bharathiyar Universtiy Data\n• Sub-vertical: Physical Marketing → Digital Marketing\n• Owner role: Marketing Head → Meghala	\N	2026-06-10 06:27:31.281
cmq7ot0n8007onlre9tas3t98	cmoqp77wq000u5tvm2k2xey51	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:27:58.724
cmq7ouxml007rnlre3uz4k2ec	cmoqpaore00165tvmaw2fu975	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:29:28.125
cmq7ovof8007unlreemd5owvp	cmoqp5ps0000i5tvmjw33bt46	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: Digital Marketing Lead → Meghala	\N	2026-06-10 06:30:02.852
cmq7ow7ig007xnlre39omz5wc	cmoqp6xce000o5tvmkebvt656	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:30:27.593
cmq7oy2md0080nlref3csnret	cmol098n3001nlltvlhm9wq3q	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:31:54.565
cmq7ozk9v0083nlrew64swjvq	cmol08vuj001hlltvfoy03mnn	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:33:04.099
cmq7p01yn0086nlrekfwk8v77	cmol07esr000tlltvqyfe4tg3	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:33:27.023
cmq7p0isj0089nlrecxs5bsya	cmoqpg5mh001o5tvmzzkrw3on	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:33:48.835
cmq7p15hu008cnlre6qf8a4sc	cmol07stu000zlltv5nmnrjwv	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:34:18.258
cmq7p2xbd008gnlree2f5sr69	cmol08emp001blltv3bod4x30	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Sathishanandan\n• Status: NOT STARTED → DELAYED	DELAYED	2026-06-10 06:35:40.969
cmq7p3l1c008jnlre36g4co80	cmol467yz008elltvjj75mv3k	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Title: Career Path in FAshion → Career Path in Fashion\n• Owner role: — → Aruna	\N	2026-06-10 06:36:11.712
cmq7p47si008mnlrephxil5nv	cmol04e340008lltvpm473qod	cmoj2reur002txk85m6ya4byh	🔄 Status → COMPLETED	COMPLETED	2026-06-10 06:36:41.202
cmq7p53tv008pnlresc6eugpg	cmol467yz008elltvjj75mv3k	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Deadline: 2026-05-04 → 2026-05-19	\N	2026-06-10 06:37:22.724
cmq7p5v46008snlre18nj1f6a	cmoqpf4g4001c5tvmfc4k88iv	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → DELAYED	DELAYED	2026-06-10 06:37:58.086
cmq7p7foq008vnlrebuknvkcr	cmol06rf2000nlltv4xh76si4	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Sathishanandan	\N	2026-06-10 06:39:11.402
cmq7p803l008ynlrewdcy5a7j	cmoqpfls7001i5tvmcgy4wbk5	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:39:37.858
cmq7p9vcv0099nlre7wgm6phv	cmokzm8k6000l54jtfzogvob3	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Pandi Elavarasan	\N	2026-06-10 06:41:05.023
cmq7pauwn009enlreoyqx242s	cmoqph70000205tvm939y1q0b	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:41:51.095
cmq7pc8cs009jnlrezfu3yxku	cmokznkc3000r54jt1xfx3gn3	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Arunraaj Manickaraj\n• Status: NOT STARTED → PARKED	PARKED	2026-06-10 06:42:55.18
cmq7pd6qc009mnlrebxiwd4fe	cmokzuevx001954jtdct4b9ot	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Dr.Krishnaraj	\N	2026-06-10 06:43:39.733
cmq7phzp7009snlreudyqiko4	cmoqp9yyn00105tvmst9mr9ub	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:47:23.899
cmq7pkitm009xnlre0g8pfqvx	cmpfcose3007szj6sqfa9w92a	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —	\N	2026-06-10 06:49:21.995
cmq7plb4c00a0nlre7ln8g91m	cmpfcwkzl0083zj6syid80ji3	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —	\N	2026-06-10 06:49:58.669
cmq7pltua00a4nlre0hz6cy4i	cmok2wc9o002xp2zxrnrr0w23	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative	\N	2026-06-10 06:50:22.93
cmq7pmf5b00a7nlreflcwrujs	cmol10dij005blltv0kazatah	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → PARKED	PARKED	2026-06-10 06:50:50.543
cmq7pmp6z00aanlreribyme1f	cmol0tbtd003klltvlqk9t6ab	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —	\N	2026-06-10 06:51:03.563
cmq7pnczt00adnlrel91igqch	cmol0sawt003elltvjks06c8c	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —	\N	2026-06-10 06:51:34.41
cmq7pnnzt00agnlretpm4bcc0	cmpfafdfh001kzj6siu3h74vj	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —	\N	2026-06-10 06:51:48.666
cmq7pnzru00ajnlremxo0hxp0	cmol118h5005nlltvbyzbaqbm	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —	\N	2026-06-10 06:52:03.931
cmq7pomvx00amnlrerbh6o8cm	cmol10tub005hlltv7axlxwze	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Owner role: — → Udhaykumar\n• Status: NOT STARTED → WAITING FOR APPROVAL	WAITING_FOR_APPROVAL	2026-06-10 06:52:33.885
cmq7pp4hy00apnlreb7w01nid	cmol0rkf80038lltvh9l0izwv	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → DELAYED	DELAYED	2026-06-10 06:52:56.711
cmq7ppqfo00asnlreqydxozc0	cmol100un0055lltvr783b2hg	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:53:25.141
cmq7pq72300avnlre7xjiu47j	cmol0xq5f004jlltvn0f6ah0l	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:53:46.683
cmq7pr5rf00aynlre0vo1cwnw	cmol0wjbw004blltvgwksns1y	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:54:31.659
cmq7pvgf300b1nlrelfjb2jqo	cmol1cpxh007qlltva536ro2m	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:57:52.095
cmq7pvmli00b4nlrem7vi4f7i	cmol1cpxh007qlltva536ro2m	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative	\N	2026-06-10 06:58:00.102
cmq7pwf5e00b7nlrel7x9qasu	cmol1c9fj007klltv9uci9ey6	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Owner role: — → Udhaykumar\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 06:58:37.106
cmq7pxk4l00banlrehbv33a2y	cmok2zxyw0030p2zx8woiygko	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Marketing\n• Owner role: Student Affairs → Pandi Elavarasan\n• Status: NOT STARTED → WAITING FOR APPROVAL	WAITING_FOR_APPROVAL	2026-06-10 06:59:30.213
cmq7pybbv00bfnlre4bgmp0v8	cmol0ozaa002slltvl985mqwz	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:00:05.467
cmq7pysa800binlrei0wuaqxz	cmol1btgh007elltvridj5ut5	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:00:27.44
cmq7pz6up00blnlref2572y6d	cmol0ur96003vlltvwgpsga8u	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:00:46.321
cmq7pznte00bonlreer62vuew	cmol0lvg60024lltvu09l47i0	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:01:08.307
cmq7q0wsg00btnlre9t0ofyt7	cmol0kdf3001wlltvu4o07lfs	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Launch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:02:06.592
cmq7q1ekq00bwnlrerniioxu8	cmol1av3m006wlltvnfz82z5d	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:02:29.642
cmq7q1txe00bznlre84rsnoa4	cmol1afkx006qlltvfobd3p8u	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:02:49.538
cmq7q2jzu00c2nlrep75615l0	cmol0vbzl0043lltvf64fhdzs	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:03:23.322
cmq7q2xhr00c5nlreg3sd2nbc	cmok35hwo0033p2zxobzj12at	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Sub-vertical: Prelaunch → —\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:03:40.815
cmq7q3brg00c8nlre28v2aecw	cmol15ejs0065lltv9xgpay3p	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Vertical: RGU → Creative\n• Status: NOT STARTED → COMPLETED	COMPLETED	2026-06-10 07:03:59.308
cmq7q521b00cbnlrespgmdrdt	cmpv3cc1p0002zsl63cvbi0he	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Owner role: — → Arunraaj Manickaraj\n• Status: NOT STARTED → IN PROGRESS	IN_PROGRESS	2026-06-10 07:05:20.015
cmq7r6rn800dnnlre7wnuhp0i	cmq7r6ib900dgnlreli5ui3zw	cmoj2reur002txk85m6ya4byh	📝 Edit:\n• Deadline: — → 2026-06-16	\N	2026-06-10 07:34:39.476
cmqevh60s00icnlrev5ca1byd	cmqettjab00etnlre4xhpzr0l	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Computing Day wise attendance percentage - Manikandan → Day-wise attendance percentage needs to be monitored and reviewed regularly - Dr.Manikandan	\N	2026-06-15 07:09:06.346
cmqevhvq700ifnlre8uqudbbn	cmqetu6oe00f1nlreqxo683hw	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Computing Assessment feedback to be collected from students - Manikandan → Assessment feedback to be collected from students and analyzed for improvement - Dr.Manikandan	\N	2026-06-15 07:09:39.68
cmqevinbm00iinlrenmpn16lc	cmqetvdr200f9nlrevvvlbmy4	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Computing 281 students to be plaed before July is the target -  Manikandan → Target to place 281 students before July to be tracked and achieved -  Dr.MAnikandan	\N	2026-06-15 07:10:15.442
cmqevjjqo00ilnlre81ipi9be	cmqetvye800fhnlreilr6h75j	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Computing OLT Training feedback to be collected (other than food feedback) - Manikandan → OLT Training feedback to be collected (excluding food-related feedback) - Dr.Manikandan	\N	2026-06-15 07:10:57.456
cmqevkzw500ionlre60sdfza6	cmqeu2utz00fpnlre2kcnxfsj	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of computing Feed back on the MAT classes and Linkedin Learning - Manikandan → Feedback to be collected on MAT classes and LinkedIn Learning initiatives - Dr.Krishnaraj	\N	2026-06-15 07:12:05.045
cmqevlijq00irnlre3kl0c0z2	cmqetvye800fhnlreilr6h75j	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: OLT Training feedback to be collected (excluding food-related feedback) - Dr.Manikandan → OLT Training feedback to be collected (excluding food-related feedback) - Dr.Raje (CAT Team)	\N	2026-06-15 07:12:29.222
cmqevm8s700iunlrelpvn3wgi	cmqetu6oe00f1nlreqxo683hw	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: Assessment feedback to be collected from students and analyzed for improvement - Dr.Manikandan → Assessment feedback to be collected from students and analyzed for improvement - Dr.Krishnaraj	\N	2026-06-15 07:13:03.223
cmqevxd6900ixnlrefvobgay2	cmqeu4gl000fxnlrebbgbvsau	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Commerce Fortnight bond can be collected and implemented for all schools - → School of Commerce Fortnight bond can be collected and implemented for all schools - Dr.Krishnaraj	\N	2026-06-15 07:21:42.129
cmqevxw4m00j0nlrehx887moc	cmqeu5gct00g5nlre0t4k9fns	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Commerce Assessment feedback to be collected from the students → School of Commerce Assessment feedback to be collected from the students - Dr.Krishnaraj	\N	2026-06-15 07:22:06.695
cmqevyhyj00j3nlreqf98d3mi	cmqeu7ek900gdnlreq4rh8gcq	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated. → School of Commerce 100% attendance is mandatory for Tally class,Commitment letter can be collected from Heads and yellow card can be issued if it is violated - Dr.Hema,Dr.Krishnaraj	\N	2026-06-15 07:22:34.987
cmqevzqlu00j6nlrehoou5dwx	cmqeu96tl00glnlrejclj6v5x	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Commerce CAT plan → Yellow card system to be implemented for attendance violations - Dr.Krishnaraj	\N	2026-06-15 07:23:32.85
cmqew0u0v00j9nlre8g504750	cmqeu9ol000gtnlre4g3q89uz	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of commerce Assessment plan need to be monitored and can be made common for all levels. → CAT plan needs to be prepared and monitored - Dr.Raje (CAT Team)	\N	2026-06-15 07:24:23.935
cmqew1hte00jcnlrewc7n75um	cmqeub0o900h1nlrewaiidrf2	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of commerce Assessment process need to be finalized → Assessment plan to be standardized and implemented commonly across all levels - Dr.Raje (CAT Team)	\N	2026-06-15 07:24:54.77
cmqew2b2m00jfnlreu3zlv2mr	cmqeubm5y00h9nlre35vay5fk	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of commerce Assessment outcome need to be finalized → Assessment process and evaluation framework need to be finalized - Dr.Raje (CAT Team)	\N	2026-06-15 07:25:32.687
cmqew2vhe00jinlrewqw8rpvd	cmqeuccux00hhnlre1z3cnhvd	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of business 115 offer letters need to be collected and documented by the Placement office → Assessment outcomes and expected deliverables need to be finalized - Dr.Raje (CAT Team)	\N	2026-06-15 07:25:59.138
cmqew3dzj00jlnlreyvsc7wvb	cmqeudcjc00hpnlrevdk2mdm5	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of Viscom All attendance and outcome need to be monitored → 115 offer letters need to be collected and properly documented by the Placement Office - Siva sir	\N	2026-06-15 07:26:23.12
cmqew593q00jonlre7yondfbd	cmqeuedlg00hxnlreojqkaxpm	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: School of viscom Feedback need to be collected for all events - sathish → School of Media & Performing Arts - Attendance and learning outcomes need to be monitored regularly - Dr.Krishnaraj	\N	2026-06-15 07:27:50.084
cmqew63qd00jrnlrepqnp7qvn	cmqeuet0y00i5nlre93jnn1bp	cmoj2rf13002xxk85dachrvmn	📝 Edit:\n• Title: CDF Plan for demo day and the outcome plan to be monitored → School of Media & Performing Arts - Feedback to be collected for all events conducted - Dr.Krishnaraj	\N	2026-06-15 07:28:29.797
\.


--
-- Data for Name: Timer; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Timer" (id, "userId", label, "fireAt", sent, "sentAt", "cancelledAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."User" (id, email, name, "passwordHash", "systemRole", "ownerRoleId", active, "lastSeenAt", "createdAt", "updatedAt") FROM stdin;
cmoj2rexy002vxk851qncfoc2	cbo@rathinam.in	Dr. BN (CBO)	$2a$10$O8V9Za4tOVQTvwGEpkJuweGEf5Bf5pc2.mnmpV/XvqiZ8/ftvKZUW	CBO	\N	t	2026-06-13 04:55:39.808	2026-04-28 20:24:41.83	2026-06-13 04:55:39.809
cmoj2reur002txk85m6ya4byh	sadmin@rathinam.in	Super Admin	$2a$10$/it1OzlfAeTbkS9ojXeUVe.SpLO/cJSPTrrfNTQZgyKlfUco5JTlC	SUPER_ADMIN	\N	t	\N	2026-04-28 20:24:41.716	2026-04-30 08:12:54.479
cmoj2rf13002xxk85dachrvmn	sm@rathinam.in	Senior Manager	$2a$10$Vr66A1RReDDtGiVQz/jZtuUrAO6RRuTvrqnvX8v8o21VCB9wwmvP2	SM	cmoj2ren2000yxk85nm65jskt	t	\N	2026-04-28 20:24:41.943	2026-04-30 08:12:54.701
\.


--
-- Data for Name: Vertical; Type: TABLE DATA; Schema: public; Owner: scp
--

COPY public."Vertical" (id, name, code, description, "colorHex", "sortOrder", active, "createdAt", "updatedAt") FROM stdin;
cmoj2rena0010xk85cuzrw5fp	Marketing	MKT	Admissions, branding, lead generation, lead nurturing, walk-in conversion	#4f46e5	0	t	2026-04-28 20:24:41.446	2026-06-11 05:04:10.926
cmq7r3jvy00d2nlrev76jr1jz	Research	RSH	\N	#4ce6d4	0	t	2026-06-10 07:32:09.454	2026-06-11 05:04:21.547
cmoxy29h700375tvmbr0bhywf	Registrar	REG	\N	#69892f	0	t	2026-05-09 06:09:42.506	2026-06-11 05:04:21.547
cmol6xe3q009dlltva235e6ag	Creative	CRT	\N	#da0b7a	0	t	2026-04-30 07:56:51.32	2026-04-30 07:56:51.32
cmoj2renh0011xk85ij9xbfhe	RTC	RTC	Student learning ecosystem, RAALE, growth card, CoE, campus life, research, ranking	#0ea5e9	1	t	2026-04-28 20:24:41.454	2026-04-30 08:12:54.249
cmoj2renl0012xk85vwlmtkom	Placements	PLC	Company connect, training effectiveness, KPI, quality placements	#10b981	2	t	2026-04-28 20:24:41.457	2026-04-30 08:12:54.253
cmoj2renn0013xk857ix3cstf	AIC RAISE	AIC	Incubation, revenue model, schemes, venture studio, events	#f59e0b	3	t	2026-04-28 20:24:41.459	2026-04-30 08:12:54.255
cmoj2renr0014xk8560p00ufi	RGU	RGU	Prelaunch, launch, team setup, change management, faculty handbooks	#7c3aed	4	t	2026-04-28 20:24:41.463	2026-04-30 08:12:54.257
cmoj2rent0015xk85js8spr5y	Special Strategic Projects	SSP	New ideas, boss instructions, management agenda, urgent special work	#ef4444	5	t	2026-04-28 20:24:41.466	2026-04-30 08:12:54.259
cmoxxs64l002y5tvm69ga2uj6	Fashion Design, Media & Performing Arts	FDMPA	\N	#9f1bd0	0	t	2026-05-09 06:01:51.621	2026-05-09 06:01:51.621
cmps0oof80003heomf5urdcuh	RAALE - Learning Ecosystem	RAALE	\N	#008cb4	0	t	2026-05-30 07:16:12.836	2026-05-30 07:18:34.568
\.


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Availability Availability_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Availability"
    ADD CONSTRAINT "Availability_pkey" PRIMARY KEY (id);


--
-- Name: BossInstruction BossInstruction_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."BossInstruction"
    ADD CONSTRAINT "BossInstruction_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (key);


--
-- Name: Intervention Intervention_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Intervention"
    ADD CONSTRAINT "Intervention_pkey" PRIMARY KEY (id);


--
-- Name: Note Note_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OwnerRole OwnerRole_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."OwnerRole"
    ADD CONSTRAINT "OwnerRole_pkey" PRIMARY KEY (id);


--
-- Name: ParkingLot ParkingLot_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."ParkingLot"
    ADD CONSTRAINT "ParkingLot_pkey" PRIMARY KEY (id);


--
-- Name: Pin Pin_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Pin"
    ADD CONSTRAINT "Pin_pkey" PRIMARY KEY (id);


--
-- Name: Priority Priority_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Priority"
    ADD CONSTRAINT "Priority_pkey" PRIMARY KEY (id);


--
-- Name: SubVertical SubVertical_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."SubVertical"
    ADD CONSTRAINT "SubVertical_pkey" PRIMARY KEY (id);


--
-- Name: TaskUpdate TaskUpdate_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."TaskUpdate"
    ADD CONSTRAINT "TaskUpdate_pkey" PRIMARY KEY (id);


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: Timer Timer_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Timer"
    ADD CONSTRAINT "Timer_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vertical Vertical_pkey; Type: CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Vertical"
    ADD CONSTRAINT "Vertical_pkey" PRIMARY KEY (id);


--
-- Name: Appointment_attendeeId_startAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Appointment_attendeeId_startAt_idx" ON public."Appointment" USING btree ("attendeeId", "startAt");


--
-- Name: Appointment_organizerId_startAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Appointment_organizerId_startAt_idx" ON public."Appointment" USING btree ("organizerId", "startAt");


--
-- Name: Appointment_status_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Appointment_status_idx" ON public."Appointment" USING btree (status);


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entity_entityId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "AuditLog_entity_entityId_idx" ON public."AuditLog" USING btree (entity, "entityId");


--
-- Name: AuditLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "AuditLog_userId_createdAt_idx" ON public."AuditLog" USING btree ("userId", "createdAt");


--
-- Name: Availability_userId_dayOfWeek_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Availability_userId_dayOfWeek_idx" ON public."Availability" USING btree ("userId", "dayOfWeek");


--
-- Name: BossInstruction_state_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "BossInstruction_state_idx" ON public."BossInstruction" USING btree (state);


--
-- Name: FeatureFlag_category_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "FeatureFlag_category_idx" ON public."FeatureFlag" USING btree (category);


--
-- Name: Intervention_resolved_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Intervention_resolved_idx" ON public."Intervention" USING btree (resolved);


--
-- Name: Intervention_snoozedUntil_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Intervention_snoozedUntil_idx" ON public."Intervention" USING btree ("snoozedUntil");


--
-- Name: Note_authorId_createdAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Note_authorId_createdAt_idx" ON public."Note" USING btree ("authorId", "createdAt");


--
-- Name: Note_createdAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Note_createdAt_idx" ON public."Note" USING btree ("createdAt");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_recipientId_seenAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Notification_recipientId_seenAt_idx" ON public."Notification" USING btree ("recipientId", "seenAt");


--
-- Name: OwnerRole_name_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "OwnerRole_name_key" ON public."OwnerRole" USING btree (name);


--
-- Name: Pin_userId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Pin_userId_idx" ON public."Pin" USING btree ("userId");


--
-- Name: Pin_userId_kind_refId_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "Pin_userId_kind_refId_key" ON public."Pin" USING btree ("userId", kind, "refId");


--
-- Name: Priority_code_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "Priority_code_key" ON public."Priority" USING btree (code);


--
-- Name: SubVertical_verticalId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "SubVertical_verticalId_idx" ON public."SubVertical" USING btree ("verticalId");


--
-- Name: SubVertical_verticalId_name_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "SubVertical_verticalId_name_key" ON public."SubVertical" USING btree ("verticalId", name);


--
-- Name: TaskUpdate_taskId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "TaskUpdate_taskId_idx" ON public."TaskUpdate" USING btree ("taskId");


--
-- Name: Task_code_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "Task_code_key" ON public."Task" USING btree (code);


--
-- Name: Task_droppedAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Task_droppedAt_idx" ON public."Task" USING btree ("droppedAt");


--
-- Name: Task_ownerUserId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Task_ownerUserId_idx" ON public."Task" USING btree ("ownerUserId");


--
-- Name: Task_priorityId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Task_priorityId_idx" ON public."Task" USING btree ("priorityId");


--
-- Name: Task_subOwnerId_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Task_subOwnerId_idx" ON public."Task" USING btree ("subOwnerId");


--
-- Name: Task_verticalId_status_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Task_verticalId_status_idx" ON public."Task" USING btree ("verticalId", status);


--
-- Name: Timer_fireAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Timer_fireAt_idx" ON public."Timer" USING btree ("fireAt");


--
-- Name: Timer_userId_sent_cancelledAt_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "Timer_userId_sent_cancelledAt_idx" ON public."Timer" USING btree ("userId", sent, "cancelledAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_systemRole_idx; Type: INDEX; Schema: public; Owner: scp
--

CREATE INDEX "User_systemRole_idx" ON public."User" USING btree ("systemRole");


--
-- Name: Vertical_code_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "Vertical_code_key" ON public."Vertical" USING btree (code);


--
-- Name: Vertical_name_key; Type: INDEX; Schema: public; Owner: scp
--

CREATE UNIQUE INDEX "Vertical_name_key" ON public."Vertical" USING btree (name);


--
-- Name: Appointment Appointment_attendeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_interventionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES public."Intervention"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Appointment Appointment_organizerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Availability Availability_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Availability"
    ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BossInstruction BossInstruction_capturedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."BossInstruction"
    ADD CONSTRAINT "BossInstruction_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Intervention Intervention_raisedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Intervention"
    ADD CONSTRAINT "Intervention_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Intervention Intervention_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Intervention"
    ADD CONSTRAINT "Intervention_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Note Note_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_recipientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ParkingLot ParkingLot_capturedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."ParkingLot"
    ADD CONSTRAINT "ParkingLot_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Pin Pin_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Pin"
    ADD CONSTRAINT "Pin_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SubVertical SubVertical_verticalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."SubVertical"
    ADD CONSTRAINT "SubVertical_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES public."Vertical"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TaskUpdate TaskUpdate_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."TaskUpdate"
    ADD CONSTRAINT "TaskUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TaskUpdate TaskUpdate_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."TaskUpdate"
    ADD CONSTRAINT "TaskUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."Task"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Task Task_ownerRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_ownerRoleId_fkey" FOREIGN KEY ("ownerRoleId") REFERENCES public."OwnerRole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_ownerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_priorityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_priorityId_fkey" FOREIGN KEY ("priorityId") REFERENCES public."Priority"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Task Task_subOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_subOwnerId_fkey" FOREIGN KEY ("subOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_subVerticalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_subVerticalId_fkey" FOREIGN KEY ("subVerticalId") REFERENCES public."SubVertical"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Task Task_verticalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_verticalId_fkey" FOREIGN KEY ("verticalId") REFERENCES public."Vertical"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Timer Timer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."Timer"
    ADD CONSTRAINT "Timer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_ownerRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: scp
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_ownerRoleId_fkey" FOREIGN KEY ("ownerRoleId") REFERENCES public."OwnerRole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict yJbuCsBnzaNEBp0mWgxfBtWHgX6OXN7sbNrerBKp5ZskqSSXrZ48uwcHnBLJgYM

