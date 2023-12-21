#![feature(slice_group_by)]

extern crate cron_job;
use cron_job::CronJob;
use shared::models::package_manager_repository::PackageManagerRepository;
use shared::utils::{
    display_banner, get_and_install_latest_cloud_config, setup_package_repository,
};

#[tokio::main]
async fn main() {
    display_banner();
    start_cron();
}

fn start_cron() {
    let mut cron = CronJob::default();
    let packages_repository: PackageManagerRepository = setup_package_repository();

    cron.new_job("*/10 * * * * *", move || run(&packages_repository));
    cron.start();
}

pub fn run(packages: &PackageManagerRepository) {
    run_on_cron(packages);
}

// The function to be executed
pub fn run_on_cron(packages: &PackageManagerRepository) {
    smol::block_on(async {
        println!("Executed function");
        get_and_install_latest_cloud_config(packages).await;
    });
}
