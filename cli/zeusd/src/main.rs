#![feature(slice_group_by)]

extern crate cron_job;
use async_cron_scheduler::*;
use chrono::offset::Local;
use cron_job::CronJob;
use serde_yaml;
use sha256::digest;
use smol::Timer;
use std::fs;
use std::time::Duration;

use reqwest;
use shared::models::package::{
    new as new_package_manifest, PackageDetails, PackageDetailsLocal, PackageManifest,
};
use shared::models::package_manager_repository::{
    PackageManagerRepository, PackageManagerRepositoryActions,
};
use shared::utils::{
    display_banner, get_latest_cloud_config, get_zeus_config, get_zeus_config_path,
    install_package_manager, run_command, setup_package_repository, update_cloud_file_config,
    update_local_file_config,
};
use std::cmp::Ordering;

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

// The function to be executed.
pub fn run_on_cron(packages: &PackageManagerRepository) {
    smol::block_on(async {
        println!("Executed function");
        let mut local_config: PackageManifest = get_zeus_config();
        let cloud_config: Option<PackageManifest> = get_latest_cloud_config().await;

        if cloud_config.is_none() {
            println!("");
            return ();
        }

        let cloud_config = cloud_config.unwrap();

        let cloud_config_packages: Vec<PackageDetailsLocal> = cloud_config
            .packages
            .values()
            .map(|a| (*a).clone().into())
            .map(|mut a: PackageDetailsLocal| {
                a.typer = String::from("new");
                a
            })
            .collect();

        let local_config_packages: Vec<PackageDetailsLocal> = local_config
            .packages
            .values()
            .map(|a| (*a).clone().into())
            .map(|mut a: PackageDetailsLocal| {
                a.typer = String::from("old");
                a
            })
            .collect();

        let mut package_collective =
            [&local_config_packages[..], &cloud_config_packages[..]].concat();

        // sort and group by name
        package_collective.sort_by(|a, b| a.name.partial_cmp(&b.name).unwrap());
        let group_by_name =
            package_collective.group_by(|a, b| a.name.cmp(&b.name) == Ordering::Equal);

        let mut diffed: Vec<&PackageDetailsLocal> = vec![];
        println!(" --------> group by name: {:?}", &group_by_name);
        println!("");
        for group in group_by_name {
            let mut _action = "install";

            match group.len() {
                1 => {
                    let vector = group.get(0).unwrap();
                    diffed.push(vector);

                    match vector.typer.as_str() {
                        "new" => {}
                        _ => _action = "uninstall",
                    };
                }

                _ => {
                    let new = match group.get(0).unwrap().typer.as_str() {
                        "new" => group.get(0),
                        _ => group.get(1),
                    };

                    let matched = group.get(0).unwrap().hash == group.get(1).unwrap().hash;
                    match matched {
                        true => {}
                        false => {
                            diffed.push(new.unwrap());
                        }
                    };
                }
            }
        }

        // sort the diffed packages and group them by vendors,
        diffed.sort_by(|a, b| a.vendor.partial_cmp(&b.vendor).unwrap());
        let group_by_vendor = diffed.group_by(|a, b| a.vendor.cmp(&b.vendor) == Ordering::Equal);
        println!(" --------> diffed: {:?}", &diffed);
        println!("");

        println!(" --------> group by vendor: {:?}", &group_by_vendor);
        for by_vendor in group_by_vendor {
            let _vendor = &by_vendor.get(0).unwrap().vendor;
            let vendor_repository = packages.get(_vendor).unwrap();
            let mut rs: Vec<&PackageDetailsLocal> = by_vendor.iter().map(|a| *a).collect();

            rs.sort_by(|a, b| a.typer.partial_cmp(&b.typer).unwrap());
            let group_by_typer = rs.group_by(|a, b| a.typer.cmp(&b.typer) == Ordering::Equal);

            for installation in group_by_typer {
                let packages: Vec<String> = installation[..]
                    .iter()
                    .map(|a| a.name.to_string())
                    .collect();

                let install_action = match &installation.get(0).unwrap().typer.as_str() {
                    &"new" => {
                        for package in &packages {
                            let pkg = package.to_string();
                            let _ = (vendor_repository.install)(&vec![pkg]).unwrap();
                        }
                    }
                    &"old" => {
                        for package in &packages {
                            let pkg = package.clone();
                            let _ = (vendor_repository.uninstall)(&vec![pkg]).unwrap();
                        }
                    }
                    _ => panic!("never will happen"),
                };

                let content = serde_yaml::to_string(&cloud_config).unwrap();
                update_local_file_config(content.as_str());
                println!("------------------------------");
            }

            println!("");
        }
    });
}
