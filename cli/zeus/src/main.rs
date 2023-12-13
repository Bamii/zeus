#![feature(slice_group_by)]

use rand::{distributions::Alphanumeric, Rng};
use seahorse;
use serde_yaml;
use sha256::digest;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::env;
use std::process;
use sysinfo::{System, SystemExt};
use uuid::Uuid;

use shared::models::package::{PackageDetails, PackageDetailsLocal, PackageManifest};
use shared::models::package_manager::{PackageManager, Parse};
use shared::models::package_manager_repository::PackageManagerRepositoryActions;
use shared::utils::{
    display_banner, get_zeus_config, install_package_manager, link_computer, run_command,
    setup_package_repository, update_cloud_file_config, update_local_file_config,
};

////////////////////////////////////////////////////////
#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    let app = seahorse::App::new(env!("CARGO_PKG_NAME"))
        .description(env!("CARGO_PKG_DESCRIPTION"))
        .author(env!("CARGO_PKG_AUTHORS"))
        .version(env!("CARGO_PKG_VERSION"))
        .usage("cli [name]")
        .action(default_action_wrapper)
        .command(link_command());

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
        .action(add_action)
}

fn config_command() -> seahorse::Command {
    seahorse::Command::new("config")
        .description("config command")
        .alias("c")
        .usage("cli config")
        .action(add_action)
}

fn add_action(c: &seahorse::Context) {
    display_banner();
    println!("linking this computer to zeus...");
    link_computer();
}

fn default_action(c: &seahorse::Context) -> Option<String> {
    let program = &c.args[0];

    let packages_repository = setup_package_repository();
    let package_manager = packages_repository.get(program).unwrap();

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

            //let mtchs = (&package_manager.parse_command)(&active_command.2);
            //        println!("mtchss: {:?}", mtchs);

            match output.status.success() {
                true => {
                    update_packages(
                        (String::from(program), active_command.1, active_command.2),
                        &mut packages,
                        &package_manager,
                    );
                    zeus_config.packages = packages;

                    // update the manifest
                    match serde_yaml::to_string(&zeus_config) {
                        Ok(content) => {
                            update_local_file_config(&content.as_str());

                            update_cloud_file_config(&content.as_str());
                        }
                        Err(_) => {}
                    };

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

fn update_packages(
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
