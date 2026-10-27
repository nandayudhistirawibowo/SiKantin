CREATE DATABASE IF NOT EXISTS sikantin
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;

USE sikantin;

CREATE TABLE IF NOT EXISTS profiles (
	id CHAR(36) NOT NULL,
	nama VARCHAR(120) NOT NULL,
	nim VARCHAR(20) NULL,
	no_telepon VARCHAR(30) NULL,
	peran VARCHAR(32) NOT NULL,
	avatar_url TEXT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY uq_profiles_nim (nim),
	KEY idx_profiles_peran_nama (peran, nama)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenants (
	id CHAR(36) NOT NULL,
	nama_tenant VARCHAR(120) NOT NULL,
	lokasi VARCHAR(255) NULL,
	jam_operasional VARCHAR(120) NULL,
	no_telepon VARCHAR(30) NULL,
	qris_image_url TEXT NULL,
	pemilik_id CHAR(36) NULL,
	status_buka BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY uq_tenants_pemilik_id (pemilik_id),
	KEY idx_tenants_nama (nama_tenant),
	CONSTRAINT fk_tenants_pemilik
		FOREIGN KEY (pemilik_id) REFERENCES profiles (id)
		ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
	id CHAR(36) NOT NULL,
	tenant_id CHAR(36) NOT NULL,
	nama_menu VARCHAR(120) NOT NULL,
	kategori VARCHAR(80) NULL,
	harga DECIMAL(12, 2) NOT NULL,
	tersedia BOOLEAN NOT NULL DEFAULT TRUE,
	foto_url TEXT NULL,
	waktu_persiapan SMALLINT UNSIGNED NOT NULL DEFAULT 0,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY idx_menu_items_tenant_nama (tenant_id, nama_menu),
	CONSTRAINT fk_menu_items_tenant
		FOREIGN KEY (tenant_id) REFERENCES tenants (id)
		ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
	id CHAR(36) NOT NULL,
	tenant_id CHAR(36) NOT NULL,
	mahasiswa_id CHAR(36) NOT NULL,
	nomor_pesanan VARCHAR(64) NOT NULL,
	nama_mahasiswa VARCHAR(120) NOT NULL,
	phone VARCHAR(30) NULL,
	status VARCHAR(40) NOT NULL DEFAULT 'Menunggu',
	total DECIMAL(12, 2) NOT NULL,
	metode_pembayaran ENUM('qris', 'tunai') NOT NULL DEFAULT 'qris',
	bukti_transfer TEXT NULL,
	alasan_pembatalan TEXT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	UNIQUE KEY uq_orders_nomor_pesanan (nomor_pesanan),
	KEY idx_orders_mahasiswa_created (mahasiswa_id, created_at),
	KEY idx_orders_tenant_created (tenant_id, created_at),
	KEY idx_orders_tenant_status (tenant_id, status),
	CONSTRAINT fk_orders_tenant
		FOREIGN KEY (tenant_id) REFERENCES tenants (id)
		ON UPDATE CASCADE ON DELETE RESTRICT,
	CONSTRAINT fk_orders_mahasiswa
		FOREIGN KEY (mahasiswa_id) REFERENCES profiles (id)
		ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
	id CHAR(36) NOT NULL,
	order_id CHAR(36) NOT NULL,
	menu_item_id CHAR(36) NULL,
	nama_menu VARCHAR(120) NOT NULL,
	harga_satuan DECIMAL(12, 2) NOT NULL,
	jumlah INT UNSIGNED NOT NULL,
	subtotal DECIMAL(12, 2) NOT NULL,
	catatan TEXT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY idx_order_items_order (order_id),
	KEY idx_order_items_menu (menu_item_id),
	CONSTRAINT fk_order_items_order
		FOREIGN KEY (order_id) REFERENCES orders (id)
		ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT fk_order_items_menu
		FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
		ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
