BEGIN;
-- Additive: historical moments/photos and upload files remain untouched.
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'MOMENT');
ALTER TABLE posts ADD COLUMN type "ContentType" NOT NULL DEFAULT 'ARTICLE', ADD COLUMN source_moment_id uuid UNIQUE;
CREATE TABLE albums (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(100) NOT NULL UNIQUE, name_en varchar(100) NOT NULL DEFAULT '', description_en varchar(500) NOT NULL DEFAULT '', description varchar(500) NOT NULL DEFAULT '', cover_url text, is_default boolean NOT NULL DEFAULT false, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX albums_one_default ON albums(is_default) WHERE is_default;
CREATE TABLE album_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), album_id uuid NOT NULL REFERENCES albums(id) ON DELETE RESTRICT, media_id uuid REFERENCES media(id) ON DELETE RESTRICT, legacy_photo_id uuid UNIQUE REFERENCES photos(id) ON DELETE RESTRICT, url text NOT NULL, name varchar(255) NOT NULL, mime_type text NOT NULL DEFAULT 'image/webp', position integer NOT NULL DEFAULT 0);
CREATE INDEX album_items_order ON album_items(album_id,position);
INSERT INTO albums(name,is_default) VALUES ('默认相册',true);
-- Preserve locale photo grouping, including different album names across locales.
INSERT INTO albums(name) SELECT DISTINCT trim(t.album) FROM photos p JOIN LATERAL (SELECT album FROM photo_translations WHERE photo_id=p.id ORDER BY (locale='zh') DESC LIMIT 1) t ON true WHERE trim(t.album)<>'' ON CONFLICT(name) DO NOTHING;
UPDATE albums a SET name_en=coalesce((SELECT trim(e.album) FROM photos p JOIN LATERAL (SELECT album FROM photo_translations WHERE photo_id=p.id ORDER BY (locale='zh') DESC LIMIT 1) primary_name ON true JOIN photo_translations e ON e.photo_id=p.id AND e.locale='en' WHERE trim(primary_name.album)=a.name AND trim(e.album)<>'' ORDER BY p.created_at,p.id LIMIT 1),'');
INSERT INTO album_items(album_id,media_id,legacy_photo_id,url,name,position)
SELECT a.id,m.id,p.id,p.url,coalesce(t.title,''),row_number() OVER (PARTITION BY a.id ORDER BY p.created_at,p.id)-1
FROM photos p LEFT JOIN LATERAL (SELECT * FROM photo_translations WHERE photo_id=p.id ORDER BY (locale='zh') DESC LIMIT 1) t ON true
JOIN albums a ON a.name=CASE WHEN trim(coalesce(t.album,''))='' THEN '默认相册' ELSE trim(t.album) END
LEFT JOIN media m ON p.url='/api/v1/media/'||m.key;
-- Full historical locale labels/descriptions remain on PhotoTranslation via legacy_photo_id.
INSERT INTO album_items(album_id,media_id,url,name,mime_type,position)
SELECT a.id,m.id,'/api/v1/media/'||m.key,m.original_name,m.mime_type,200000+row_number() OVER (ORDER BY m.created_at,m.id)
FROM media m CROSS JOIN albums a WHERE a.is_default AND NOT EXISTS (SELECT 1 FROM album_items i WHERE i.media_id=m.id);
DO $$ DECLARE r record; path text; owner_id uuid; BEGIN
 SELECT id INTO owner_id FROM users LIMIT 1;
 IF owner_id IS NULL AND EXISTS(SELECT 1 FROM moments) THEN RAISE EXCEPTION 'Existing moments require the owner account before content migration'; END IF;
 FOR r IN SELECT * FROM moments LOOP
  LOOP path:=left(replace(gen_random_uuid()::text,'-',''),8); EXIT WHEN NOT EXISTS(SELECT 1 FROM posts WHERE slug=path); END LOOP;
  INSERT INTO posts(id,slug,type,source_moment_id,created_at,updated_at,author_id) VALUES(r.id,path,'MOMENT',r.id,r.created_at,r.updated_at,owner_id);
 END LOOP;
END $$;
INSERT INTO post_translations(post_id,locale,title,excerpt,content,content_format,status,published_at,updated_at)
SELECT moment_id,locale,'','',content,'markdown',status,published_at,updated_at FROM moment_translations;

COMMIT;
