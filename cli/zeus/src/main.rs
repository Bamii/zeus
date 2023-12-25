#![feature(slice_group_by)]

use rand::{distributions::Alphanumeric, Rng};
use seahorse;
use serde_yaml;
use smol;
use std::collections::HashMap;
use std::env;

use shared::models::package::{PackageDetails, PackageManifest};
use shared::models::package_manager::{PackageManager, Parse};
use shared::models::package_manager_repository::PackageManagerRepositoryActions;
use shared::utils::{
    display_banner, ensure_zeus_files, get_and_install_latest_cloud_config, get_system_platform,
    get_zeus_config, get_zeus_config_string, get_zeus_dir, install_package_manager, link_computer,
    run_command, setup_package_repository, update_cloud_file_config, update_local_file_config,
};

////////////////////////////////////////////////////////
#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    let app = seahorse::App::new(env!("CARGO_PKG_NAME"))
        .description(env!("CARGO_PKG_DESCRIPTION"))
        .author(env!("CARGO_PKG_AUTHORS"))
        .version(env!("CARGO_PKG_VERSION"))
        .usage("cli [install/uninstall/upgrade command]")
        .action(default_action_wrapper)
        .command(link_command())
        .command(config_command());

    ensure_zeus_files();
    app.run(args);
}

fn default_action_wrapper(c: &seahorse::Context) {
    default_action(c);
}

fn link_command() -> seahorse::Command {
    seahorse::Command::new("link")
        .description("link computer command")
        .alias("l")
        .usage("cli link(a) [nums...]")
        .action(link_action)
}

fn config_command() -> seahorse::Command {
    seahorse::Command::new("config")
        .description("config command")
        .alias("c")
        .usage("config")
        .command(
            seahorse::Command::new("upload")
                .description("upload your current config as the latest one")
                .action(upload_config_action),
        )
        .command(
            seahorse::Command::new("download")
                .description("download the latest config")
                .action(download_config_action),
        )
}

fn link_action(c: &seahorse::Context) {
    display_banner();
    println!("linking this computer to zeus...");

    if &c.args.len() == &0 {
        println!("please input your api key...");
        println!("");
        return ();
    }

    link_computer(&c.args[0]);
}

fn download_config_action(_: &seahorse::Context) {
    display_banner();
    println!("downloading and applying the latest config...");

    smol::block_on(async {
        let packages_repository = setup_package_repository();
        get_and_install_latest_cloud_config(&packages_repository).await;

        println!("-----------------------------");
        println!("to upload a config, either append zeus to your package install command as in:");
        println!("> zeus choco install -y zig");
        println!("or if you already have a config in your zeus root directory: at {}. run the command below", get_zeus_dir());
        println!("> zeus config upload");
        println!()
    })
}

fn upload_config_action(_: &seahorse::Context) {
    display_banner();
    println!("uploading the latest config to zeus...");

    let config = get_zeus_config_string();
    update_cloud_file_config(&config.as_str());
}

fn default_action(c: &seahorse::Context) -> Option<String> {
    if &c.args.len() == &0 {
        let _ = &c.help();
        return None;
    }

    let program = &c.args[0];

    let packages_repository = setup_package_repository();
    let package_manager = match packages_repository.get(program) {
        Some(pm) => pm,
        None => {
            let _ = &c.help();
            return None;
        }
    };

    let mut zeus_config: PackageManifest = get_zeus_config();
    let mut packages = zeus_config.packages.clone();

    // then run the parse;
    // if the parse fails, then return;
    match package_manager.parse(&c.args) {
        Some(active_command) => {
            display_banner();

            println!("checking if {} has been installed", program);
            let is_package_manager_installed =
                match run_command(&vec![program.to_string(), String::from("--version")]) {
                    Ok(output) => output.status.success(),
                    Err(_) => false,
                };

            // TODO: FEATURE:: install the package manager if it is not installed.
            if !is_package_manager_installed {
                println!("{} has not been installed", program);
                install_package_manager(program.to_string());
                return None;
            } else {
                println!("{} is installed", program);
            }

            // run the command sent by the user.
            println!("");
            println!("running user command: {:?}", &c.args.join(" "));
            println!("--------------------------------");
            println!("");
            let output = run_command(
                &c.args[0..]
                    .iter()
                    .map(|a| a.to_string())
                    .collect::<Vec<_>>(),
            )
            .expect("failed to execute process");

            println!("{}", String::from_utf8(output.stdout).unwrap());

            match output.status.success() {
                true => {
                    process_packages(
                        (String::from(program), active_command.1, active_command.2),
                        &mut packages,
                        &package_manager,
                    );
                    zeus_config.packages = packages;

                    // update the manifest
                    let content = serde_yaml::to_string(&zeus_config).unwrap();

                    update_local_file_config(&content.as_str());

                    update_cloud_file_config(&content.as_str());

                    // update the manifest
                    Some("".to_string())
                }
                false => {
                    println!("");
                    println!("you need some things done... an error occured");
                    println!("nooooo");
                    None
                }
            }
        }
        None => {
            println!("you need some things done... an error occured");
            println!("nooooo");
            return None;
        }
    }
}

fn process_packages(
    (program, action, matches): (String, String, Vec<String>),
    packages: &mut HashMap<String, PackageDetails>,
    package_manager: &PackageManager,
) {
    match action.as_str() {
        "install" => {
            let mtchs = (&package_manager.parse_command)(&matches);

            mtchs.iter().for_each(|a| {
                let meta = (package_manager.get_package_and_version)(&a);
                let hash: String = rand::thread_rng()
                    .sample_iter(&Alphanumeric)
                    .take(12)
                    .map(char::from)
                    .collect();

                packages.insert(
                    meta.name.to_string(),
                    PackageDetails {
                        name: meta.name.to_string(),
                        version: meta.version.to_string(),
                        flags: [].to_vec(),
                        hash,
                        platform: get_system_platform(),
                        vendor: program.to_string(),
                    },
                );

                println!(
                    "added {:?}; version={:?} to config.",
                    &meta.name, &meta.version
                );
            });
        }
        "uninstall" | "u" | "remove" => {
            matches.iter().for_each(|a| {
                match packages.contains_key(a) {
                    false => {}
                    true => {
                        packages.remove(a);
                    }
                };
            });
        }
        _ => {
            panic!("panic out");
        }
    }
}
